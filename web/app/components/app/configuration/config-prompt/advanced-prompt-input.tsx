'use client'
import type { FC } from 'react'
import React from 'react'
import copy from 'copy-to-clipboard'
import cn from 'classnames'
import { useTranslation } from 'react-i18next'
import { useContext } from 'use-context-selector'
import { useBoolean } from 'ahooks'
import produce from 'immer'
import s from './style.module.css'
import MessageTypeSelector from './message-type-selector'
import ConfirmAddVar from './confirm-add-var'
import type { PromptRole, PromptVariable } from '@/models/debug'
import { HelpCircle, Trash03 } from '@/app/components/base/icons/src/vender/line/general'
import { Clipboard, ClipboardCheck } from '@/app/components/base/icons/src/vender/line/files'
import Tooltip from '@/app/components/base/tooltip'
import PromptEditor from '@/app/components/base/prompt-editor'
import ConfigContext from '@/context/debug-configuration'
import { getNewVar, getVars } from '@/utils/var'
import { AppType } from '@/types/app'
import { AlertCircle } from '@/app/components/base/icons/src/vender/solid/alertsAndFeedback'
import { useModalContext } from '@/context/modal-context'
import type { ExternalDataTool } from '@/models/common'
import { useToastContext } from '@/app/components/base/toast'

type Props = {
  type: PromptRole
  isChatMode: boolean
  value: string
  onTypeChange: (value: PromptRole) => void
  onChange: (value: string) => void
  canDelete: boolean
  onDelete: () => void
  promptVariables: PromptVariable[]
  isContextMissing: boolean
  onHideContextMissingTip: () => void
}

const AdvancedPromptInput: FC<Props> = ({
  type,
  isChatMode,
  value,
  onChange,
  onTypeChange,
  canDelete,
  onDelete,
  promptVariables,
  isContextMissing,
  onHideContextMissingTip,
}) => {
  const { t } = useTranslation()

  const {
    mode,
    hasSetBlockStatus,
    modelConfig,
    setModelConfig,
    conversationHistoriesRole,
    showHistoryModal,
    dataSets,
    showSelectDataSet,
    externalDataToolsConfig,
    setExternalDataToolsConfig,
  } = useContext(ConfigContext)
  const { notify } = useToastContext()
  const { setShowExternalDataToolModal } = useModalContext()
  const handleOpenExternalDataToolModal = () => {
    setShowExternalDataToolModal({
      payload: {},
      onSaveCallback: (newExternalDataTool: ExternalDataTool) => {
        setExternalDataToolsConfig([...externalDataToolsConfig, newExternalDataTool])
      },
      onValidateBeforeSaveCallback: (newExternalDataTool: ExternalDataTool) => {
        for (let i = 0; i < promptVariables.length; i++) {
          if (promptVariables[i].key === newExternalDataTool.variable) {
            notify({ type: 'error', message: t('appDebug.varKeyError.keyAlreadyExists', { key: promptVariables[i].key }) })
            return false
          }
        }

        for (let i = 0; i < externalDataToolsConfig.length; i++) {
          if (externalDataToolsConfig[i].variable === newExternalDataTool.variable) {
            notify({ type: 'error', message: t('appDebug.varKeyError.keyAlreadyExists', { key: externalDataToolsConfig[i].variable }) })
            return false
          }
        }

        return true
      },
    })
  }
  const isChatApp = mode === AppType.chat
  const [isCopied, setIsCopied] = React.useState(false)

  const promptVariablesObj = (() => {
    const obj: Record<string, boolean> = {}
    promptVariables.forEach((item) => {
      obj[item.key] = true
    })
    return obj
  })()
  const [newPromptVariables, setNewPromptVariables] = React.useState<PromptVariable[]>(promptVariables)
  const [isShowConfirmAddVar, { setTrue: showConfirmAddVar, setFalse: hideConfirmAddVar }] = useBoolean(false)
  const handlePromptChange = (newValue: string) => {
    if (value === newValue)
      return
    onChange(newValue)
  }
  const handleBlur = () => {
    const keys = getVars(value)
    const newPromptVariables = keys.filter(key => !(key in promptVariablesObj) && !externalDataToolsConfig.find(item => item.variable === key)).map(key => getNewVar(key))
    if (newPromptVariables.length > 0) {
      setNewPromptVariables(newPromptVariables)
      showConfirmAddVar()
    }
  }

  const handleAutoAdd = (isAdd: boolean) => {
    return () => {
      if (isAdd) {
        const newModelConfig = produce(modelConfig, (draft) => {
          draft.configs.prompt_variables = [...draft.configs.prompt_variables, ...newPromptVariables]
        })
        setModelConfig(newModelConfig)
      }
      hideConfirmAddVar()
    }
  }

  const editorHeight = isChatMode ? 'h-[200px]' : 'h-[508px]'
  const contextMissing = (
    <div
      className='flex items-center justify-between pt-2 pb-1 pl-4 pr-3 h-11 rounded-tl-xl rounded-tr-xl'
      style={{
        background: 'linear-gradient(180deg, #FEF0C7 0%, rgba(254, 240, 199, 0) 100%)',
      }}
    >
      <div className='flex items-center pr-2' >
        <AlertCircle className='mr-1 w-4 h-4 text-[#F79009]'/>
        <div className='leading-[18px] text-[13px] font-medium text-[#DC6803]'>{t('appDebug.promptMode.contextMissing')}</div>
      </div>
      <div
        className='flex items-center h-6 px-2 rounded-md bg-[#fff] border border-gray-200 shadow-xs text-xs font-medium text-primary-600 cursor-pointer'
        onClick={onHideContextMissingTip}
      >{t('common.operation.ok')}</div>
    </div>
  )
  return (
    <div className={`relative ${!isContextMissing ? s.gradientBorder : s.warningBorder}`}>
      <div className='bg-white rounded-xl'>
        {isContextMissing
          ? contextMissing
          : (
            <div className={cn(s.boxHeader, 'flex justify-between items-center h-11 pt-2 pr-3 pb-1 pl-4 rounded-tl-xl rounded-tr-xl bg-white hover:shadow-xs')}>
              {isChatMode
                ? (
                  <MessageTypeSelector value={type} onChange={onTypeChange} />
                )
                : (
                  <div className='flex items-center space-x-1'>

                    <div className='text-sm font-semibold text-indigo-800 uppercase'>{t('appDebug.pageTitle.line1')}
                    </div>
                    <Tooltip
                      htmlContent={<div className='w-[180px]'>
                        {t('appDebug.promptTip')}
                      </div>}
                      selector='config-prompt-tooltip'>
                      <HelpCircle className='w-[14px] h-[14px] text-indigo-400' />
                    </Tooltip>
                  </div>)}
              <div className={cn(s.optionWrap, 'items-center space-x-1')}>
                {canDelete && (
                  <Trash03 onClick={onDelete} className='w-6 h-6 p-1 text-gray-500 cursor-pointer' />
                )}
                {!isCopied
                  ? (
                    <Clipboard className='w-6 h-6 p-1 text-gray-500 cursor-pointer' onClick={() => {
                      copy(value)
                      setIsCopied(true)
                    }} />
                  )
                  : (
                    <ClipboardCheck className='w-6 h-6 p-1 text-gray-500' />
                  )}
              </div>
            </div>
          )}

        <div className={cn(editorHeight, 'px-4 min-h-[102px] overflow-y-auto text-sm text-gray-700')}>
          <PromptEditor
            className={editorHeight}
            value={value}
            contextBlock={{
              show: true,
              selectable: !hasSetBlockStatus.context,
              datasets: dataSets.map(item => ({
                id: item.id,
                name: item.name,
                type: item.data_source_type,
              })),
              onAddContext: showSelectDataSet,
            }}
            variableBlock={{
              variables: modelConfig.configs.prompt_variables.map(item => ({
                name: item.name,
                value: item.key,
              })),
              externalTools: externalDataToolsConfig.map(item => ({
                name: item.label!,
                variableName: item.variable!,
                icon: item.icon,
                icon_background: item.icon_background,
              })),
              onAddExternalTool: handleOpenExternalDataToolModal,
            }}
            historyBlock={{
              show: !isChatMode && isChatApp,
              selectable: !hasSetBlockStatus.history,
              history: {
                user: conversationHistoriesRole?.user_prefix,
                assistant: conversationHistoriesRole?.assistant_prefix,
              },
              onEditRole: showHistoryModal,
            }}
            queryBlock={{
              show: !isChatMode && isChatApp,
              selectable: !hasSetBlockStatus.query,
            }}
            onChange={handlePromptChange}
            onBlur={handleBlur}
          />
        </div>
        <div className='flex pb-2 pl-4'>
          <div className="h-[18px] leading-[18px] px-1 rounded-md bg-gray-100 text-xs text-gray-500">{value.length}</div>
        </div>
      </div>

      {isShowConfirmAddVar && (
        <ConfirmAddVar
          varNameArr={newPromptVariables.map(v => v.name)}
          onConfrim={handleAutoAdd(true)}
          onCancel={handleAutoAdd(false)}
          onHide={hideConfirmAddVar}
        />
      )}
    </div>
  )
}
export default React.memo(AdvancedPromptInput)
