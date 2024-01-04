import time
from typing import Optional, List, Tuple

from langchain.schema.language_model import _get_token_ids_default_method

from core.model_runtime.entities.model_entities import PriceType
from core.model_runtime.entities.text_embedding_entities import TextEmbeddingResult, EmbeddingUsage
from core.model_runtime.errors.validate import CredentialsValidateFailedError
from core.model_runtime.model_providers.__base.text_embedding_model import TextEmbeddingModel
from core.model_runtime.model_providers.zhipuai._client import ZhipuModelAPI
from core.model_runtime.model_providers.zhipuai._common import _CommonZhipuaiAI


class ZhipuAITextEmbeddingModel(_CommonZhipuaiAI, TextEmbeddingModel):
    """
    Model class for ZhipuAI text embedding model.
    """

    def _invoke(self, model: str, credentials: dict,
                texts: list[str], user: Optional[str] = None) \
            -> TextEmbeddingResult:
        """
        Invoke text embedding model

        :param model: model name
        :param credentials: model credentials
        :param texts: texts to embed
        :param user: unique user id
        :return: embeddings result
        """
        credentials_kwargs = self._to_credential_kwargs(credentials)
        client = ZhipuModelAPI(
            api_key=credentials_kwargs['api_key']
        )

        embeddings, embedding_used_tokens = self.embed_documents(model, client, texts)

        return TextEmbeddingResult(
            embeddings=embeddings,
            usage=self._calc_response_usage(model, credentials_kwargs, embedding_used_tokens),
            model=model
        )

    def get_num_tokens(self, model: str, credentials: dict, texts: list[str]) -> int:
        """
        Get number of tokens for given prompt messages

        :param model: model name
        :param credentials: model credentials
        :param texts: texts to embed
        :return:
        """
        if len(texts) == 0:
            return 0
        
        total_num_tokens = 0
        for text in texts:
            total_num_tokens += len(_get_token_ids_default_method(text))

        return total_num_tokens

    def validate_credentials(self, model: str, credentials: dict) -> None:
        """
        Validate model credentials

        :param model: model name
        :param credentials: model credentials
        :return:
        """
        try:
            # transform credentials to kwargs for model instance
            credentials_kwargs = self._to_credential_kwargs(credentials)
            client = ZhipuModelAPI(
                api_key=credentials_kwargs['api_key']
            )

            # call embedding model
            self.embed_documents(
                model=model,
                client=client,
                texts=['ping'],
            )
        except Exception as ex:
            raise CredentialsValidateFailedError(str(ex))

    def embed_documents(self, model: str, client: ZhipuModelAPI, texts: List[str]) -> Tuple[List[List[float]], int]:
        """Call out to ZhipuAI's embedding endpoint.

        Args:
            texts: The list of texts to embed.

        Returns:
            List of embeddings, one for each text.
        """
        

        embeddings = []
        for text in texts:
            response = client.invoke(model=model, prompt=text)
            data = response["data"]
            embeddings.append(data.get('embedding'))

        embedding_used_tokens = data.get('usage')

        return [list(map(float, e)) for e in embeddings], embedding_used_tokens['total_tokens'] if embedding_used_tokens else 0
    
    def embed_query(self, text: str) -> List[float]:
        """Call out to ZhipuAI's embedding endpoint.

        Args:
            text: The text to embed.

        Returns:
            Embeddings for the text.
        """
        return self.embed_documents([text])[0]
    
    def _calc_response_usage(self, model: str,credentials: dict, tokens: int) -> EmbeddingUsage:
        """
        Calculate response usage

        :param model: model name
        :param tokens: input tokens
        :return: usage
        """
        # get input price info
        input_price_info = self.get_price(
            model=model,
            credentials=credentials,
            price_type=PriceType.INPUT,
            tokens=tokens
        )

        # transform usage
        usage = EmbeddingUsage(
            tokens=tokens,
            total_tokens=tokens,
            unit_price=input_price_info.unit_price,
            price_unit=input_price_info.unit,
            total_price=input_price_info.total_amount,
            currency=input_price_info.currency,
            latency=time.perf_counter() - self.started_at
        )

        return usage
