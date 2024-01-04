# -*- coding:utf-8 -*-
import json
import logging
from datetime import datetime
from typing import Generator, Union

from flask import Response, stream_with_context
from flask_login import current_user
from flask_restful import reqparse
from werkzeug.exceptions import InternalServerError, NotFound

import services
from controllers.console import api
from controllers.console.app.error import ConversationCompletedError, AppUnavailableError, ProviderNotInitializeError, \
    ProviderQuotaExceededError, ProviderModelCurrentlyNotSupportError, CompletionRequestError
from controllers.console.explore.error import NotCompletionAppError, NotChatAppError
from controllers.console.explore.wraps import InstalledAppResource
from core.application_queue_manager import ApplicationQueueManager
from core.entities.application_entities import InvokeFrom
from core.errors.error import ProviderTokenNotInitError, QuotaExceededError, ModelCurrentlyNotSupportError
from core.model_runtime.errors.invoke import InvokeError
from extensions.ext_database import db
from libs.helper import uuid_value
from services.completion_service import CompletionService


# define completion api for user
class CompletionApi(InstalledAppResource):

    def post(self, installed_app):
        app_model = installed_app.app
        if app_model.mode != 'completion':
            raise NotCompletionAppError()

        parser = reqparse.RequestParser()
        parser.add_argument('inputs', type=dict, required=True, location='json')
        parser.add_argument('query', type=str, location='json', default='')
        parser.add_argument('files', type=list, required=False, location='json')
        parser.add_argument('response_mode', type=str, choices=['blocking', 'streaming'], location='json')
        parser.add_argument('retriever_from', type=str, required=False, default='explore_app', location='json')
        args = parser.parse_args()

        streaming = args['response_mode'] == 'streaming'
        args['auto_generate_name'] = False

        installed_app.last_used_at = datetime.utcnow()
        db.session.commit()

        try:
            response = CompletionService.completion(
                app_model=app_model,
                user=current_user,
                args=args,
                invoke_from=InvokeFrom.EXPLORE,
                streaming=streaming
            )

            return compact_response(response)
        except services.errors.conversation.ConversationNotExistsError:
            raise NotFound("Conversation Not Exists.")
        except services.errors.conversation.ConversationCompletedError:
            raise ConversationCompletedError()
        except services.errors.app_model_config.AppModelConfigBrokenError:
            logging.exception("App model config broken.")
            raise AppUnavailableError()
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
        except Exception as e:
            logging.exception("internal server error.")
            raise InternalServerError()


class CompletionStopApi(InstalledAppResource):
    def post(self, installed_app, task_id):
        app_model = installed_app.app
        if app_model.mode != 'completion':
            raise NotCompletionAppError()

        ApplicationQueueManager.set_stop_flag(task_id, InvokeFrom.EXPLORE, current_user.id)

        return {'result': 'success'}, 200


class ChatApi(InstalledAppResource):
    def post(self, installed_app):
        app_model = installed_app.app
        if app_model.mode != 'chat':
            raise NotChatAppError()

        parser = reqparse.RequestParser()
        parser.add_argument('inputs', type=dict, required=True, location='json')
        parser.add_argument('query', type=str, required=True, location='json')
        parser.add_argument('files', type=list, required=False, location='json')
        parser.add_argument('response_mode', type=str, choices=['blocking', 'streaming'], location='json')
        parser.add_argument('conversation_id', type=uuid_value, location='json')
        parser.add_argument('retriever_from', type=str, required=False, default='explore_app', location='json')
        args = parser.parse_args()

        streaming = args['response_mode'] == 'streaming'
        args['auto_generate_name'] = False

        installed_app.last_used_at = datetime.utcnow()
        db.session.commit()

        try:
            response = CompletionService.completion(
                app_model=app_model,
                user=current_user,
                args=args,
                invoke_from=InvokeFrom.EXPLORE,
                streaming=streaming
            )

            return compact_response(response)
        except services.errors.conversation.ConversationNotExistsError:
            raise NotFound("Conversation Not Exists.")
        except services.errors.conversation.ConversationCompletedError:
            raise ConversationCompletedError()
        except services.errors.app_model_config.AppModelConfigBrokenError:
            logging.exception("App model config broken.")
            raise AppUnavailableError()
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
        except Exception as e:
            logging.exception("internal server error.")
            raise InternalServerError()


class ChatStopApi(InstalledAppResource):
    def post(self, installed_app, task_id):
        app_model = installed_app.app
        if app_model.mode != 'chat':
            raise NotChatAppError()

        ApplicationQueueManager.set_stop_flag(task_id, InvokeFrom.EXPLORE, current_user.id)

        return {'result': 'success'}, 200


def compact_response(response: Union[dict, Generator]) -> Response:
    if isinstance(response, dict):
        return Response(response=json.dumps(response), status=200, mimetype='application/json')
    else:
        def generate() -> Generator:
            try:
                for chunk in response:
                    yield chunk
            except services.errors.conversation.ConversationNotExistsError:
                yield "data: " + json.dumps(api.handle_error(NotFound("Conversation Not Exists.")).get_json()) + "\n\n"
            except services.errors.conversation.ConversationCompletedError:
                yield "data: " + json.dumps(api.handle_error(ConversationCompletedError()).get_json()) + "\n\n"
            except services.errors.app_model_config.AppModelConfigBrokenError:
                logging.exception("App model config broken.")
                yield "data: " + json.dumps(api.handle_error(AppUnavailableError()).get_json()) + "\n\n"
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


api.add_resource(CompletionApi, '/installed-apps/<uuid:installed_app_id>/completion-messages', endpoint='installed_app_completion')
api.add_resource(CompletionStopApi, '/installed-apps/<uuid:installed_app_id>/completion-messages/<string:task_id>/stop', endpoint='installed_app_stop_completion')
api.add_resource(ChatApi, '/installed-apps/<uuid:installed_app_id>/chat-messages', endpoint='installed_app_chat_completion')
api.add_resource(ChatStopApi, '/installed-apps/<uuid:installed_app_id>/chat-messages/<string:task_id>/stop', endpoint='installed_app_stop_chat_completion')
