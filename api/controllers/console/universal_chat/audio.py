# -*- coding:utf-8 -*-
import logging

from flask import request
from werkzeug.exceptions import InternalServerError

import services
from controllers.console import api
from controllers.console.app.error import AppUnavailableError, ProviderNotInitializeError, \
    ProviderQuotaExceededError, ProviderModelCurrentlyNotSupportError, CompletionRequestError, \
    NoAudioUploadedError, AudioTooLargeError, \
    UnsupportedAudioTypeError, ProviderNotSupportSpeechToTextError
from controllers.console.universal_chat.wraps import UniversalChatResource
from core.errors.error import ProviderTokenNotInitError, QuotaExceededError, ModelCurrentlyNotSupportError
from core.model_runtime.errors.invoke import InvokeError
from services.audio_service import AudioService
from services.errors.audio import NoAudioUploadedServiceError, AudioTooLargeServiceError, \
    UnsupportedAudioTypeServiceError, ProviderNotSupportSpeechToTextServiceError
from models.model import AppModelConfig


class UniversalChatAudioApi(UniversalChatResource):
    def post(self, universal_app):
        app_model = universal_app
        app_model_config: AppModelConfig = app_model.app_model_config

        if not app_model_config.speech_to_text_dict['enabled']:
            raise AppUnavailableError()

        file = request.files['file']

        try:
            response = AudioService.transcript(
                tenant_id=app_model.tenant_id,
                file=file,
            )

            return response
        except services.errors.app_model_config.AppModelConfigBrokenError:
            logging.exception("App model config broken.")
            raise AppUnavailableError()
        except NoAudioUploadedServiceError:
            raise NoAudioUploadedError()
        except AudioTooLargeServiceError as e:
            raise AudioTooLargeError(str(e))
        except UnsupportedAudioTypeServiceError:
            raise UnsupportedAudioTypeError()
        except ProviderNotSupportSpeechToTextServiceError:
            raise ProviderNotSupportSpeechToTextError()
        except ProviderTokenNotInitError:
            raise ProviderNotInitializeError()
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
        

api.add_resource(UniversalChatAudioApi, '/universal-chat/audio-to-text')