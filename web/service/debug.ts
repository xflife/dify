import type { IOnCompleted, IOnData, IOnError, IOnMessageEnd, IOnMessageReplace } from './base'
import { get, post, ssePost } from './base'
import type { ChatPromptConfig, CompletionPromptConfig } from '@/models/debug'
import type { ModelModeType } from '@/types/app'
import type { ModelParameterRule } from '@/app/components/header/account-setting/model-provider-page/declarations'

export type AutomaticRes = {
  prompt: string
  variables: string[]
  opening_statement: string
}

export const sendChatMessage = async (appId: string, body: Record<string, any>, { onData, onCompleted, onError, getAbortController, onMessageEnd, onMessageReplace }: {
  onData: IOnData
  onCompleted: IOnCompleted
  onMessageEnd: IOnMessageEnd
  onMessageReplace: IOnMessageReplace
  onError: IOnError
  getAbortController?: (abortController: AbortController) => void
}) => {
  return ssePost(`apps/${appId}/chat-messages`, {
    body: {
      ...body,
      response_mode: 'streaming',
    },
  }, { onData, onCompleted, onError, getAbortController, onMessageEnd, onMessageReplace })
}

export const stopChatMessageResponding = async (appId: string, taskId: string) => {
  return post(`apps/${appId}/chat-messages/${taskId}/stop`)
}

export const sendCompletionMessage = async (appId: string, body: Record<string, any>, { onData, onCompleted, onError, onMessageReplace }: {
  onData: IOnData
  onCompleted: IOnCompleted
  onError: IOnError
  onMessageReplace: IOnMessageReplace
}) => {
  return ssePost(`apps/${appId}/completion-messages`, {
    body: {
      ...body,
      response_mode: 'streaming',
    },
  }, { onData, onCompleted, onError, onMessageReplace })
}

export const fetchSuggestedQuestions = (appId: string, messageId: string) => {
  return get(`apps/${appId}/chat-messages/${messageId}/suggested-questions`)
}

export const fetchConvesationMessages = (appId: string, conversation_id: string) => {
  return get(`apps/${appId}/chat-messages`, {
    params: {
      conversation_id,
    },
  })
}

export const generateRule = (body: Record<string, any>) => {
  return post<AutomaticRes>('/rule-generate', {
    body,
  })
}

export const fetchModelParams = (providerName: string, modelId: string) => {
  return get(`workspaces/current/model-providers/${providerName}/models/parameter-rules`, {
    params: {
      model: modelId,
    },
  }) as Promise<{ data: ModelParameterRule[] }>
}

export const fetchPromptTemplate = ({
  appMode,
  mode,
  modelName,
  hasSetDataSet,
}: { appMode: string; mode: ModelModeType; modelName: string; hasSetDataSet: boolean }) => {
  return get<Promise<{ chat_prompt_config: ChatPromptConfig; completion_prompt_config: CompletionPromptConfig; stop: [] }>>('/app/prompt-templates', {
    params: {
      app_mode: appMode,
      model_mode: mode,
      model_name: modelName,
      has_context: hasSetDataSet,
    },
  })
}

export const fetchTextGenerationMessge = ({
  appId,
  messageId,
}: { appId: string; messageId: string }) => {
  return get<Promise<{ message: [] }>>(`/apps/${appId}/messages/${messageId}`)
}
