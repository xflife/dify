# -*- coding:utf-8 -*-
import json
import logging
from typing import Generator, Union

from flask import stream_with_context, Response
from flask_login import current_user
from flask_restful import reqparse, marshal_with
from flask_restful.inputs import int_range
from werkzeug.exceptions import NotFound, InternalServerError

import services
from controllers.console import api
from controllers.console.app.error import AppMoreLikeThisDisabledError, ProviderNotInitializeError, \
    ProviderQuotaExceededError, ProviderModelCurrentlyNotSupportError, CompletionRequestError
from controllers.console.explore.error import NotCompletionAppError, AppSuggestedQuestionsAfterAnswerDisabledError, \
    NotChatAppError
from controllers.console.explore.wraps import InstalledAppResource
from core.entities.application_entities import InvokeFrom
from core.errors.error import ProviderTokenNotInitError, QuotaExceededError, ModelCurrentlyNotSupportError
from core.model_runtime.errors.invoke import InvokeError
from fields.message_fields import message_infinite_scroll_pagination_fields
from libs.helper import uuid_value
from services.completion_service import CompletionService
from services.errors.app import MoreLikeThisDisabledError
from services.errors.conversation import ConversationNotExistsError
from services.errors.message import MessageNotExistsError, SuggestedQuestionsAfterAnswerDisabledError
from services.message_service import MessageService


class MessageListApi(InstalledAppResource):

    @marshal_with(message_infinite_scroll_pagination_fields)
    def get(self, installed_app):
        app_model = installed_app.app

        if app_model.mode != 'chat':
            raise NotChatAppError()

        parser = reqparse.RequestParser()
        parser.add_argument('conversation_id', required=True, type=uuid_value, location='args')
        parser.add_argument('first_id', type=uuid_value, location='args')
        parser.add_argument('limit', type=int_range(1, 100), required=False, default=20, location='args')
        args = parser.parse_args()

        try:
            return MessageService.pagination_by_first_id(app_model, current_user,
                                                     args['conversation_id'], args['first_id'], args['limit'])
        except services.errors.conversation.ConversationNotExistsError:
            raise NotFound("Conversation Not Exists.")
        except services.errors.message.FirstMessageNotExistsError:
            raise NotFound("First Message Not Exists.")


class MessageFeedbackApi(InstalledAppResource):
    def post(self, installed_app, message_id):
        app_model = installed_app.app

        message_id = str(message_id)

        parser = reqparse.RequestParser()
        parser.add_argument('rating', type=str, choices=['like', 'dislike', None], location='json')
        args = parser.parse_args()

        try:
            MessageService.create_feedback(app_model, message_id, current_user, args['rating'])
        except services.errors.message.MessageNotExistsError:
            raise NotFound("Message Not Exists.")

        return {'result': 'success'}


class MessageMoreLikeThisApi(InstalledAppResource):
    def get(self, installed_app, message_id):
        app_model = installed_app.app
        if app_model.mode != 'completion':
            raise NotCompletionAppError()

        message_id = str(message_id)

        parser = reqparse.RequestParser()
        parser.add_argument('response_mode', type=str, required=True, choices=['blocking', 'streaming'], location='args')
        args = parser.parse_args()

        streaming = args['response_mode'] == 'streaming'

        try:
            response = CompletionService.generate_more_like_this(
                app_model=app_model,
                user=current_user,
                message_id=message_id,
                invoke_from=InvokeFrom.EXPLORE,
                streaming=streaming
            )
            return compact_response(response)
        except MessageNotExistsError:
            raise NotFound("Message Not Exists.")
        except MoreLikeThisDisabledError:
            raise AppMoreLikeThisDisabledError()
        except ProviderTokenNotInitError as ex:
            raise ProviderNotInitializeError(ex.description)
        except QuotaExceededError:
            raise ProviderQuotaExceededError()
        except ModelCurrentlyNotSupportError:
            raise ProviderModelCurrentlyNotSupportError()
        except InvokeError as e:
            raise CompletionRequestError(str(e))
        except ValueError as e:
            raise e
        except Exception:
            logging.exception("internal server error.")
            raise InternalServerError()


def compact_response(response: Union[dict, Generator]) -> Response:
    if isinstance(response, dict):
        return Response(response=json.dumps(response), status=200, mimetype='application/json')
    else:
        def generate() -> Generator:
            try:
                for chunk in response:
                    yield chunk
            except MessageNotExistsError:
                yield "data: " + json.dumps(api.handle_error(NotFound("Message Not Exists.")).get_json()) + "\n\n"
            except MoreLikeThisDisabledError:
                yield "data: " + json.dumps(api.handle_error(AppMoreLikeThisDisabledError()).get_json()) + "\n\n"
            except ProviderTokenNotInitError as ex:
                yield "data: " + json.dumps(api.handle_error(ProviderNotInitializeError(ex.description)).get_json()) + "\n\n"
            except QuotaExceededError:
                yield "data: " + json.dumps(api.handle_error(ProviderQuotaExceededError()).get_json()) + "\n\n"
            except ModelCurrentlyNotSupportError:
                yield "data: " + json.dumps(api.handle_error(ProviderModelCurrentlyNotSupportError()).get_json()) + "\n\n"
            except InvokeError as e:
                yield "data: " + json.dumps(api.handle_error(CompletionRequestError(str(e))).get_json()) + "\n\n"
            except ValueError as e:
                yield "data: " + json.dumps(api.handle_error(e).get_json()) + "\n\n"
            except Exception:
                logging.exception("internal server error.")
                yield "data: " + json.dumps(api.handle_error(InternalServerError()).get_json()) + "\n\n"

        return Response(stream_with_context(generate()), status=200,
                        mimetype='text/event-stream')


class MessageSuggestedQuestionApi(InstalledAppResource):
    def get(self, installed_app, message_id):
        app_model = installed_app.app
        if app_model.mode != 'chat':
            raise NotCompletionAppError()

        message_id = str(message_id)

        try:
            questions = MessageService.get_suggested_questions_after_answer(
                app_model=app_model,
                user=current_user,
                message_id=message_id
            )
        except MessageNotExistsError:
            raise NotFound("Message not found")
        except ConversationNotExistsError:
            raise NotFound("Conversation not found")
        except SuggestedQuestionsAfterAnswerDisabledError:
            raise AppSuggestedQuestionsAfterAnswerDisabledError()
        except ProviderTokenNotInitError as ex:
            raise ProviderNotInitializeError(ex.description)
        except QuotaExceededError:
            raise ProviderQuotaExceededError()
        except ModelCurrentlyNotSupportError:
            raise ProviderModelCurrentlyNotSupportError()
        except InvokeError as e:
            raise CompletionRequestError(str(e))
        except Exception:
            logging.exception("internal server error.")
            raise InternalServerError()

        return {'data': questions}


api.add_resource(MessageListApi, '/installed-apps/<uuid:installed_app_id>/messages', endpoint='installed_app_messages')
api.add_resource(MessageFeedbackApi, '/installed-apps/<uuid:installed_app_id>/messages/<uuid:message_id>/feedbacks', endpoint='installed_app_message_feedback')
api.add_resource(MessageMoreLikeThisApi, '/installed-apps/<uuid:installed_app_id>/messages/<uuid:message_id>/more-like-this', endpoint='installed_app_more_like_this')
api.add_resource(MessageSuggestedQuestionApi, '/installed-apps/<uuid:installed_app_id>/messages/<uuid:message_id>/suggested-questions', endpoint='installed_app_suggested_question')
