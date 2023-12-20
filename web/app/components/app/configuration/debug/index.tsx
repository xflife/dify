'use client'
import type { FC } from 'react'
import useSWR from 'swr'
import { useTranslation } from 'react-i18next'
import React, { useEffect, useRef, useState } from 'react'
import cn from 'classnames'
import produce from 'immer'
import { useBoolean, useGetState } from 'ahooks'
import { useContext } from 'use-context-selector'
import dayjs from 'dayjs'
import HasNotSetAPIKEY from '../base/warning-mask/has-not-set-api'
import FormattingChanged from '../base/warning-mask/formatting-changed'
import GroupName from '../base/group-name'
import CannotQueryDataset from '../base/warning-mask/cannot-query-dataset'
import { AppType, ModelModeType, TransferMethod } from '@/types/app'
import PromptValuePanel, { replaceStringWithValues } from '@/app/components/app/configuration/prompt-value-panel'
import type { IChatItem } from '@/app/components/app/chat/type'
import Chat from '@/app/components/app/chat'
import ConfigContext from '@/context/debug-configuration'
import { ToastContext } from '@/app/components/base/toast'
import { fetchConvesationMessages, fetchSuggestedQuestions, sendChatMessage, sendCompletionMessage, stopChatMessageResponding } from '@/service/debug'
import Button from '@/app/components/base/button'
import type { ModelConfig as BackendModelConfig, VisionFile } from '@/types/app'
import { promptVariablesToUserInputsForm } from '@/utils/model-config'
import TextGeneration from '@/app/components/app/text-generate/item'
import { IS_CE_EDITION } from '@/config'
import { useProviderContext } from '@/context/provider-context'
import type { Inputs } from '@/models/debug'
import { fetchFileUploadConfig } from '@/service/common'
import type { Annotation as AnnotationType } from '@/models/log'
type IDebug = {
  hasSetAPIKEY: boolean
  onSetting: () => void
  inputs: Inputs
}

const Debug: FC<IDebug> = ({
  hasSetAPIKEY = true,
  onSetting,
  inputs,
}) => {
  const { t } = useTranslation()
  const {
    appId,
    mode,
    modelModeType,
    hasSetBlockStatus,
    isAdvancedMode,
    promptMode,
    chatPromptConfig,
    completionPromptConfig,
    introduction,
    suggestedQuestionsAfterAnswerConfig,
    speechToTextConfig,
    citationConfig,
    moderationConfig,
    moreLikeThisConfig,
    formattingChanged,
    setFormattingChanged,
    conversationId,
    setConversationId,
    controlClearChatMessage,
    dataSets,
    modelConfig,
    completionParams,
    hasSetContextVar,
    datasetConfigs,
    externalDataToolsConfig,
    visionConfig,
    annotationConfig,
  } = useContext(ConfigContext)
  const { speech2textDefaultModel } = useProviderContext()
  const [chatList, setChatList, getChatList] = useGetState<IChatItem[]>([])
  const chatListDomRef = useRef<HTMLDivElement>(null)
  const { data: fileUploadConfigResponse } = useSWR({ url: '/files/upload' }, fetchFileUploadConfig)
  useEffect(() => {
    // scroll to bottom
    if (chatListDomRef.current)
      chatListDomRef.current.scrollTop = chatListDomRef.current.scrollHeight
  }, [chatList])

  const getIntroduction = () => replaceStringWithValues(introduction, modelConfig.configs.prompt_variables, inputs)
  useEffect(() => {
    if (introduction && !chatList.some(item => !item.isAnswer)) {
      setChatList([{
        id: `${Date.now()}`,
        content: getIntroduction(),
        isAnswer: true,
        isOpeningStatement: true,
      }])
    }
  }, [introduction, modelConfig.configs.prompt_variables, inputs])

  const [isResponsing, { setTrue: setResponsingTrue, setFalse: setResponsingFalse }] = useBoolean(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [isShowFormattingChangeConfirm, setIsShowFormattingChangeConfirm] = useState(false)
  const [isShowCannotQueryDataset, setShowCannotQueryDataset] = useState(false)
  const [isShowSuggestion, setIsShowSuggestion] = useState(false)
  const [messageTaskId, setMessageTaskId] = useState('')
  const [hasStopResponded, setHasStopResponded, getHasStopResponded] = useGetState(false)

  useEffect(() => {
    if (formattingChanged && chatList.some(item => !item.isAnswer))
      setIsShowFormattingChangeConfirm(true)

    setFormattingChanged(false)
  }, [formattingChanged])

  const clearConversation = async () => {
    setConversationId(null)
    abortController?.abort()
    setResponsingFalse()
    setChatList(introduction
      ? [{
        id: `${Date.now()}`,
        content: getIntroduction(),
        isAnswer: true,
        isOpeningStatement: true,
      }]
      : [])
    setIsShowSuggestion(false)
  }

  const handleConfirm = () => {
    clearConversation()
    setIsShowFormattingChangeConfirm(false)
  }

  const handleCancel = () => {
    setIsShowFormattingChangeConfirm(false)
  }

  const { notify } = useContext(ToastContext)
  const logError = (message: string) => {
    notify({ type: 'error', message })
  }

  const checkCanSend = () => {
    if (isAdvancedMode && mode === AppType.chat) {
      if (modelModeType === ModelModeType.completion) {
        if (!hasSetBlockStatus.history) {
          notify({ type: 'error', message: t('appDebug.otherError.historyNoBeEmpty'), duration: 3000 })
          return false
        }
        if (!hasSetBlockStatus.query) {
          notify({ type: 'error', message: t('appDebug.otherError.queryNoBeEmpty'), duration: 3000 })
          return false
        }
      }
    }
    let hasEmptyInput = ''
    const requiredVars = modelConfig.configs.prompt_variables.filter(({ key, name, required }) => {
      const res = (!key || !key.trim()) || (!name || !name.trim()) || (required || required === undefined || required === null)
      return res
    }) // compatible with old version
    // debugger
    requiredVars.forEach(({ key, name }) => {
      if (hasEmptyInput)
        return

      if (!inputs[key])
        hasEmptyInput = name
    })

    if (hasEmptyInput) {
      logError(t('appDebug.errorMessage.valueOfVarRequired', { key: hasEmptyInput }))
      return false
    }

    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    if (completionFiles.find(item => item.transfer_method === TransferMethod.local_file && !item.upload_file_id)) {
      notify({ type: 'info', message: t('appDebug.errorMessage.waitForImgUpload') })
      return false
    }
    return !hasEmptyInput
  }

  const doShowSuggestion = isShowSuggestion && !isResponsing
  const [suggestQuestions, setSuggestQuestions] = useState<string[]>([])
  const onSend = async (message: string, files?: VisionFile[]) => {
    if (isResponsing) {
      notify({ type: 'info', message: t('appDebug.errorMessage.waitForResponse') })
      return false
    }

    if (files?.find(item => item.transfer_method === TransferMethod.local_file && !item.upload_file_id)) {
      notify({ type: 'info', message: t('appDebug.errorMessage.waitForImgUpload') })
      return false
    }

    const postDatasets = dataSets.map(({ id }) => ({
      dataset: {
        enabled: true,
        id,
      },
    }))
    const contextVar = modelConfig.configs.prompt_variables.find(item => item.is_context_var)?.key

    const postModelConfig: BackendModelConfig = {
      pre_prompt: !isAdvancedMode ? modelConfig.configs.prompt_template : '',
      prompt_type: promptMode,
      chat_prompt_config: {},
      completion_prompt_config: {},
      user_input_form: promptVariablesToUserInputsForm(modelConfig.configs.prompt_variables),
      dataset_query_variable: contextVar || '',
      opening_statement: introduction,
      more_like_this: {
        enabled: false,
      },
      suggested_questions_after_answer: suggestedQuestionsAfterAnswerConfig,
      speech_to_text: speechToTextConfig,
      retriever_resource: citationConfig,
      sensitive_word_avoidance: moderationConfig,
      external_data_tools: externalDataToolsConfig,
      agent_mode: {
        enabled: true,
        tools: [...postDatasets],
      },
      model: {
        provider: modelConfig.provider,
        name: modelConfig.model_id,
        mode: modelConfig.mode,
        completion_params: completionParams as any,
      },
      dataset_configs: datasetConfigs,
      file_upload: {
        image: visionConfig,
      },
      annotation_reply: annotationConfig,
    }

    if (isAdvancedMode) {
      postModelConfig.chat_prompt_config = chatPromptConfig
      postModelConfig.completion_prompt_config = completionPromptConfig
    }

    const data: Record<string, any> = {
      conversation_id: conversationId,
      inputs,
      query: message,
      model_config: postModelConfig,
    }

    if (visionConfig.enabled && files && files?.length > 0) {
      data.files = files.map((item) => {
        if (item.transfer_method === TransferMethod.local_file) {
          return {
            ...item,
            url: '',
          }
        }
        return item
      })
    }

    // qustion
    const questionId = `question-${Date.now()}`
    const questionItem = {
      id: questionId,
      content: message,
      isAnswer: false,
      message_files: files,
    }

    const placeholderAnswerId = `answer-placeholder-${Date.now()}`
    const placeholderAnswerItem = {
      id: placeholderAnswerId,
      content: '',
      isAnswer: true,
    }

    const newList = [...getChatList(), questionItem, placeholderAnswerItem]
    setChatList(newList)

    // answer
    const responseItem: IChatItem = {
      id: `${Date.now()}`,
      content: '',
      isAnswer: true,
    }

    let _newConversationId: null | string = null

    setHasStopResponded(false)
    setResponsingTrue()
    setIsShowSuggestion(false)
    sendChatMessage(appId, data, {
      getAbortController: (abortController) => {
        setAbortController(abortController)
      },
      onData: (message: string, isFirstMessage: boolean, { conversationId: newConversationId, messageId, taskId }: any) => {
        responseItem.content = responseItem.content + message
        if (isFirstMessage && newConversationId) {
          setConversationId(newConversationId)
          _newConversationId = newConversationId
        }
        setMessageTaskId(taskId)
        if (messageId)
          responseItem.id = messageId

        // closesure new list is outdated.
        const newListWithAnswer = produce(
          getChatList().filter(item => item.id !== responseItem.id && item.id !== placeholderAnswerId),
          (draft) => {
            if (!draft.find(item => item.id === questionId))
              draft.push({ ...questionItem })

            draft.push({ ...responseItem })
          })
        setChatList(newListWithAnswer)
      },
      async onCompleted(hasError?: boolean) {
        setResponsingFalse()
        if (hasError)
          return

        if (_newConversationId) {
          const { data }: any = await fetchConvesationMessages(appId, _newConversationId as string)
          const newResponseItem = data.find((item: any) => item.id === responseItem.id)
          if (!newResponseItem)
            return

          setChatList(produce(getChatList(), (draft) => {
            const index = draft.findIndex(item => item.id === responseItem.id)
            if (index !== -1) {
              const requestion = draft[index - 1]
              draft[index - 1] = {
                ...requestion,
                log: newResponseItem.message,
              }
              draft[index] = {
                ...draft[index],
                more: {
                  time: dayjs.unix(newResponseItem.created_at).format('hh:mm A'),
                  tokens: newResponseItem.answer_tokens + newResponseItem.message_tokens,
                  latency: newResponseItem.provider_response_latency.toFixed(2),
                },
              }
            }
          }))
        }
        if (suggestedQuestionsAfterAnswerConfig.enabled && !getHasStopResponded()) {
          const { data }: any = await fetchSuggestedQuestions(appId, responseItem.id)
          setSuggestQuestions(data)
          setIsShowSuggestion(true)
        }
      },
      onMessageEnd: (messageEnd) => {
        responseItem.citation = messageEnd.retriever_resources

        const newListWithAnswer = produce(
          getChatList().filter(item => item.id !== responseItem.id && item.id !== placeholderAnswerId),
          (draft) => {
            if (!draft.find(item => item.id === questionId))
              draft.push({ ...questionItem })

            draft.push({ ...responseItem })
          })
        setChatList(newListWithAnswer)
      },
      onMessageReplace: (messageReplace) => {
        responseItem.content = messageReplace.answer
      },
      onAnnotationReply: (annotationReply) => {
        responseItem.id = annotationReply.id
        responseItem.content = annotationReply.answer
        responseItem.annotation = ({
          id: annotationReply.annotation_id,
          authorName: annotationReply.annotation_author_name,
        } as AnnotationType)
        const newListWithAnswer = produce(
          getChatList().filter(item => item.id !== responseItem.id && item.id !== placeholderAnswerId),
          (draft) => {
            if (!draft.find(item => item.id === questionId))
              draft.push({ ...questionItem })

            draft.push({
              ...responseItem,
              id: annotationReply.id,
            })
          })
        setChatList(newListWithAnswer)
      },
      onError() {
        setResponsingFalse()
        // role back placeholder answer
        setChatList(produce(getChatList(), (draft) => {
          draft.splice(draft.findIndex(item => item.id === placeholderAnswerId), 1)
        }))
      },
    })
    return true
  }

  useEffect(() => {
    if (controlClearChatMessage)
      setChatList([])
  }, [controlClearChatMessage])

  const [completionRes, setCompletionRes] = useState('')
  const [messageId, setMessageId] = useState<string | null>(null)

  const [completionFiles, setCompletionFiles] = useState<VisionFile[]>([])
  const sendTextCompletion = async () => {
    if (isResponsing) {
      notify({ type: 'info', message: t('appDebug.errorMessage.waitForResponse') })
      return false
    }

    if (dataSets.length > 0 && !hasSetContextVar) {
      setShowCannotQueryDataset(true)
      return true
    }

    if (!checkCanSend())
      return

    const postDatasets = dataSets.map(({ id }) => ({
      dataset: {
        enabled: true,
        id,
      },
    }))
    const contextVar = modelConfig.configs.prompt_variables.find(item => item.is_context_var)?.key

    const postModelConfig: BackendModelConfig = {
      pre_prompt: !isAdvancedMode ? modelConfig.configs.prompt_template : '',
      prompt_type: promptMode,
      chat_prompt_config: {},
      completion_prompt_config: {},
      user_input_form: promptVariablesToUserInputsForm(modelConfig.configs.prompt_variables),
      dataset_query_variable: contextVar || '',
      opening_statement: introduction,
      suggested_questions_after_answer: suggestedQuestionsAfterAnswerConfig,
      speech_to_text: speechToTextConfig,
      retriever_resource: citationConfig,
      sensitive_word_avoidance: moderationConfig,
      external_data_tools: externalDataToolsConfig,
      more_like_this: moreLikeThisConfig,
      agent_mode: {
        enabled: true,
        tools: [...postDatasets],
      },
      model: {
        provider: modelConfig.provider,
        name: modelConfig.model_id,
        mode: modelConfig.mode,
        completion_params: completionParams as any,
      },
      dataset_configs: datasetConfigs,
      file_upload: {
        image: visionConfig,
      },
    }

    if (isAdvancedMode) {
      postModelConfig.chat_prompt_config = chatPromptConfig
      postModelConfig.completion_prompt_config = completionPromptConfig
    }

    const data: Record<string, any> = {
      inputs,
      model_config: postModelConfig,
    }

    if (visionConfig.enabled && completionFiles && completionFiles?.length > 0) {
      data.files = completionFiles.map((item) => {
        if (item.transfer_method === TransferMethod.local_file) {
          return {
            ...item,
            url: '',
          }
        }
        return item
      })
    }

    setCompletionRes('')
    setMessageId('')
    let res: string[] = []

    setResponsingTrue()
    sendCompletionMessage(appId, data, {
      onData: (data: string, _isFirstMessage: boolean, { messageId }) => {
        res.push(data)
        setCompletionRes(res.join(''))
        setMessageId(messageId)
      },
      onMessageReplace: (messageReplace) => {
        res = [messageReplace.answer]
        setCompletionRes(res.join(''))
      },
      onCompleted() {
        setResponsingFalse()
      },
      onError() {
        setResponsingFalse()
      },
    })
  }

  const varList = modelConfig.configs.prompt_variables.map((item: any) => {
    return {
      label: item.key,
      value: inputs[item.key],
    }
  })

  return (
    <>
      <div className="shrink-0">
        <div className='flex items-center justify-between mb-2'>
          <div className='h2 '>{t('appDebug.inputs.title')}</div>
          {mode === 'chat' && (
            <Button className='flex items-center gap-1 !h-8 !bg-[#19243B] !rounded-2xl' onClick={clearConversation}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14.6615 3.98856C14.4008 3.89449 14.1132 4.03157 14.0219 4.29228L13.6348 5.37811C13.1806 4.35409 12.463 3.45371 11.5492 2.77909C8.64373 0.628913 4.50464 1.21484 2.32759 4.0907C1.274 5.48294 0.82784 7.1977 1.07511 8.91784C1.32238 10.646 2.23889 12.1754 3.64995 13.2209C4.83254 14.0944 6.21672 14.5191 7.59014 14.5191C9.59787 14.5191 11.5787 13.6187 12.8715 11.912C13.444 11.1567 13.8337 10.3128 14.0353 9.39894C14.0944 9.12748 13.9224 8.8614 13.6536 8.80227C13.3849 8.74314 13.1161 8.91247 13.057 9.18393C12.8876 9.9553 12.5571 10.6702 12.0733 11.3072C10.2268 13.745 6.71395 14.2422 4.24662 12.4146C3.05058 11.5303 2.27652 10.2375 2.06688 8.77539C1.85724 7.32134 2.23352 5.87265 3.12584 4.69543C4.96962 2.25767 8.47978 1.75776 10.9498 3.58541C11.8448 4.24658 12.514 5.1631 12.8769 6.19787L11.1541 5.52594C10.896 5.42649 10.6058 5.55282 10.5036 5.81084C10.4015 6.06886 10.5305 6.35913 10.7885 6.46127L13.3257 7.45303C13.3849 7.47722 13.4467 7.48798 13.5085 7.48798C13.5166 7.48798 13.5246 7.48529 13.5327 7.48529C13.5515 7.48798 13.5703 7.49604 13.5891 7.49604C13.7961 7.49604 13.9896 7.36703 14.0622 7.16276L14.9652 4.6363C15.0566 4.37022 14.9222 4.08263 14.6615 3.98856Z" fill="white"/>
              </svg>
              <span className='text-white text-[13px]'>{t('common.operation.refresh')}</span>
            </Button>
          )}
        </div>
        <PromptValuePanel
          appType={mode as AppType}
          onSend={sendTextCompletion}
          inputs={inputs}
          visionConfig={{
            ...visionConfig,
            image_file_size_limit: fileUploadConfigResponse?.image_file_size_limit,
          }}
          onVisionFilesChange={setCompletionFiles}
        />
      </div>
      <div className="flex flex-col grow">
        {/* Chat */}
        {mode === AppType.chat && (
          <div className="mt-[34px] h-full flex flex-col">
            <div className={cn(doShowSuggestion ? 'pb-[140px]' : (isResponsing ? 'pb-[113px]' : 'pb-[76px]'), 'relative mt-1.5 grow h-[200px] overflow-hidden')}>
              <div className="h-full overflow-x-hidden overflow-y-auto" ref={chatListDomRef}>
                <Chat
                  chatList={chatList}
                  onSend={onSend}
                  checkCanSend={checkCanSend}
                  feedbackDisabled
                  useCurrentUserAvatar
                  isResponsing={isResponsing}
                  canStopResponsing={!!messageTaskId}
                  abortResponsing={async () => {
                    await stopChatMessageResponding(appId, messageTaskId)
                    setHasStopResponded(true)
                    setResponsingFalse()
                  }}
                  isShowSuggestion={doShowSuggestion}
                  suggestionList={suggestQuestions}
                  isShowSpeechToText={speechToTextConfig.enabled && !!speech2textDefaultModel}
                  isShowCitation={citationConfig.enabled}
                  isShowCitationHitInfo
                  isShowPromptLog
                  visionConfig={{
                    ...visionConfig,
                    image_file_size_limit: fileUploadConfigResponse?.image_file_size_limit,
                  }}
                  supportAnnotation
                  appId={appId}
                  onChatListChange={setChatList}
                />
              </div>
            </div>
          </div>
        )}
        {/* Text  Generation */}
        {mode === AppType.completion && (
          <div className="mt-6">
            <GroupName name={t('appDebug.result')} />
            {(completionRes || isResponsing) && (
              <TextGeneration
                className="mt-2"
                content={completionRes}
                isLoading={!completionRes && isResponsing}
                isResponsing={isResponsing}
                isInstalledApp={false}
                messageId={messageId}
                isError={false}
                onRetry={() => { }}
                supportAnnotation
                appId={appId}
                varList={varList}
              />
            )}
          </div>
        )}
        {isShowFormattingChangeConfirm && (
          <FormattingChanged
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        )}
        {isShowCannotQueryDataset && (
          <CannotQueryDataset
            onConfirm={() => setShowCannotQueryDataset(false)}
          />
        )}
      </div>
      {!hasSetAPIKEY && (<HasNotSetAPIKEY isTrailFinished={!IS_CE_EDITION} onSetting={onSetting} />)}
    </>
  )
}
export default React.memo(Debug)
