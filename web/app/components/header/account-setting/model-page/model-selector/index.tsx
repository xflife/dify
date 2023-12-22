import type { FC } from 'react'
import React, { Fragment, useEffect, useState } from 'react'
import useSWR from 'swr'
import { Popover, Transition } from '@headlessui/react'
import { useTranslation } from 'react-i18next'
import _ from 'lodash-es'
import cn from 'classnames'
import ModelModal from '../model-modal'
import cohereConfig from '../configs/cohere'
import s from './style.module.css'
import type { BackendModel, FormValue, ProviderEnum } from '@/app/components/header/account-setting/model-page/declarations'
import { ModelType } from '@/app/components/header/account-setting/model-page/declarations'
import { ChevronDown } from '@/app/components/base/icons/src/vender/line/arrows'
import { Check, LinkExternal01, SearchLg } from '@/app/components/base/icons/src/vender/line/general'
import { XCircle } from '@/app/components/base/icons/src/vender/solid/general'
import { AlertCircle } from '@/app/components/base/icons/src/vender/line/alertsAndFeedback'
import Tooltip from '@/app/components/base/tooltip'
import ModelIcon from '@/app/components/app/configuration/config-model/model-icon'
import ModelName from '@/app/components/app/configuration/config-model/model-name'
import ProviderName from '@/app/components/app/configuration/config-model/provider-name'
import { useProviderContext } from '@/context/provider-context'
import ModelModeTypeLabel from '@/app/components/app/configuration/config-model/model-mode-type-label'
import type { ModelModeType } from '@/types/app'
import { CubeOutline } from '@/app/components/base/icons/src/vender/line/shapes'
import { useModalContext } from '@/context/modal-context'
import { useEventEmitterContextContext } from '@/context/event-emitter'
import { fetchDefaultModal, setModelProvider } from '@/service/common'
import { useToastContext } from '@/app/components/base/toast'

type Props = {
  value: {
    providerName: ProviderEnum
    modelName: string
  } | undefined
  modelType: ModelType
  isShowModelModeType?: boolean
  isShowAddModel?: boolean
  supportAgentThought?: boolean
  onChange: (value: BackendModel) => void
  popClassName?: string
  readonly?: boolean
  triggerIconSmall?: boolean
  whenEmptyGoToSetting?: boolean
  onUpdate?: () => void
}

type ModelOption = {
  type: 'model'
  value: string
  providerName: ProviderEnum
  modelDisplayName: string
  model_mode: ModelModeType
} | {
  type: 'provider'
  value: ProviderEnum
}

const ModelSelector: FC<Props> = ({
  value,
  modelType,
  isShowModelModeType,
  isShowAddModel,
  supportAgentThought,
  onChange,
  popClassName,
  readonly,
  triggerIconSmall,
  whenEmptyGoToSetting,
  onUpdate,
}) => {
  const { t } = useTranslation()
  const { setShowAccountSettingModal } = useModalContext()
  const {
    textGenerationModelList,
    embeddingsModelList,
    speech2textModelList,
    rerankModelList,
    agentThoughtModelList,
    updateModelList,
  } = useProviderContext()
  const [search, setSearch] = useState('')
  const modelList = supportAgentThought
    ? agentThoughtModelList
    : ({
      [ModelType.textGeneration]: textGenerationModelList,
      [ModelType.embeddings]: embeddingsModelList,
      [ModelType.speech2text]: speech2textModelList,
      [ModelType.reranking]: rerankModelList,
    })[modelType]
  const currModel = modelList.find(item => item.model_name === value?.modelName && item.model_provider.provider_name === value.providerName)
  const allModelNames = (() => {
    if (!search)
      return {}

    const res: Record<string, string> = {}
    modelList.forEach(({ model_name, model_display_name }) => {
      res[model_name] = model_display_name
    })
    return res
  })()
  const filteredModelList = search
    ? modelList.filter(({ model_name }) => {
      if (allModelNames[model_name].includes(search))
        return true

      return false
    })
    : modelList

  const hasRemoved = (value && value.modelName && value.providerName) && !modelList.find(({ model_name, model_provider }) => model_name === value.modelName && model_provider.provider_name === value.providerName)

  const modelOptions: ModelOption[] = (() => {
    const providers = _.uniq(filteredModelList.map(item => item.model_provider.provider_name))
    const res: ModelOption[] = []
    providers.forEach((providerName) => {
      res.push({
        type: 'provider',
        value: providerName,
      })
      const models = filteredModelList.filter(m => m.model_provider.provider_name === providerName)
      models.forEach(({ model_name, model_display_name, model_mode }) => {
        res.push({
          type: 'model',
          providerName,
          value: model_name,
          modelDisplayName: model_display_name,
          model_mode,
        })
      })
    })
    return res
  })()
  const { eventEmitter } = useEventEmitterContextContext()
  const [showRerankModal, setShowRerankModal] = useState(false)
  const [shouldFetchRerankDefaultModel, setShouldFetchRerankDefaultModel] = useState(false)
  const { notify } = useToastContext()
  const { data: rerankDefaultModel } = useSWR(shouldFetchRerankDefaultModel ? '/workspaces/current/default-model?model_type=reranking' : null, fetchDefaultModal)
  const handleOpenRerankModal = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    setShowRerankModal(true)
  }
  const handleRerankModalSave = async (originValue?: FormValue) => {
    if (originValue) {
      try {
        eventEmitter?.emit('provider-save')
        const res = await setModelProvider({
          url: `/workspaces/current/model-providers/${cohereConfig.modal.key}`,
          body: {
            config: originValue,
          },
        })
        if (res.result === 'success') {
          notify({ type: 'success', message: t('common.actionMsg.modifiedSuccessfully') })
          updateModelList(ModelType.reranking)
          setShowRerankModal(false)
          setShouldFetchRerankDefaultModel(true)
          if (onUpdate)
            onUpdate()
        }
        eventEmitter?.emit('')
      }
      catch (e) {
        eventEmitter?.emit('')
      }
    }
  }

  useEffect(() => {
    if (rerankDefaultModel && whenEmptyGoToSetting)
      onChange(rerankDefaultModel)
  }, [rerankDefaultModel])

  return (
    <div className=''>
      <Popover className='relative'>
        <Popover.Button className={cn('flex items-center px-2.5 w-full h-9 rounded-lg', readonly ? '!cursor-auto bg-gray-100 opacity-50' : 'bg-gray-100', hasRemoved && '!bg-[#FEF3F2]')}>
          {
            ({ open }) => (
              <>
                {
                  (value && value.modelName && value.providerName)
                    ? (
                      <>
                        <ModelIcon
                          className={cn('mr-1.5', !triggerIconSmall && 'w-5 h-5')}
                          modelId={value.modelName}
                          providerName={value.providerName}
                        />
                        <div className='mr-1.5 grow flex items-center text-left text-sm text-gray-900 truncate'>
                          <ModelName modelId={value.modelName} modelDisplayName={currModel?.model_display_name || value.modelName} />
                          {isShowModelModeType && (
                            <ModelModeTypeLabel className='ml-2' type={currModel?.model_mode as ModelModeType} />
                          )}
                        </div>
                      </>
                    )
                    : whenEmptyGoToSetting
                      ? (
                        <div className='grow flex items-center h-9 justify-between' onClick={handleOpenRerankModal}>
                          <div className='flex items-center text-[13px] font-medium text-primary-500'>
                            <CubeOutline className='mr-1.5 w-4 h-4' />
                            {t('common.modelProvider.selector.rerankTip')}
                          </div>
                          <LinkExternal01 className='w-3 h-3 text-gray-500' />
                        </div>
                      )
                      : (
                        <div className='grow text-left text-sm text-gray-800 opacity-60'>{t('common.modelProvider.selectModel')}</div>
                      )
                }
                {
                  hasRemoved && (
                    <Tooltip
                      selector='model-selector-remove-tip'
                      htmlContent={
                        <div className='w-[261px] text-gray-500'>{t('common.modelProvider.selector.tip')}</div>
                      }
                    >
                      <AlertCircle className='mr-1 w-4 h-4 text-[#F04438]' />
                    </Tooltip>
                  )
                }
                {
                  !readonly && !whenEmptyGoToSetting && (
                    <ChevronDown className={`w-4 h-4 text-gray-700 ${open ? 'opacity-100' : 'opacity-60'}`} />
                  )
                }
                {
                  whenEmptyGoToSetting && (value && value.modelName && value.providerName) && (
                    <ChevronDown className={`w-4 h-4 text-gray-700 ${open ? 'opacity-100' : 'opacity-60'}`} />
                  )
                }
              </>
            )
          }
        </Popover.Button>
        {!readonly && (
          <Transition
            as={Fragment}
            leave='transition ease-in duration-100'
            leaveFrom='opacity-100'
            leaveTo='opacity-0'
          >
            <Popover.Panel className={cn(popClassName, isShowModelModeType ? 'max-w-[312px]' : 'max-w-[260px]', 'absolute top-10 p-1 min-w-[232px] max-h-[366px] bg-white border-[0.5px] border-gray-200 rounded-lg shadow-lg overflow-auto z-10')}>
              <div className='px-2 pt-2 pb-1'>
                <div className='flex items-center px-2 h-8 bg-gray-100 rounded-lg'>
                  <div className='mr-1.5 p-[1px]'><SearchLg className='w-[14px] h-[14px] text-gray-400' /></div>
                  <div className='grow px-0.5'>
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className={`
                      block w-full h-8 bg-transparent text-[13px] text-gray-700
                      outline-none appearance-none border-none
                    `}
                      placeholder={t('common.modelProvider.searchModel') || ''}
                    />
                  </div>
                  {
                    search && (
                      <div className='ml-1 p-0.5 cursor-pointer' onClick={() => setSearch('')}>
                        <XCircle className='w-3 h-3 text-gray-400' />
                      </div>
                    )
                  }
                </div>
              </div>
              {
                modelOptions.map((model) => {
                  if (model.type === 'provider') {
                    return (
                      <div
                        className='px-3 pt-2 pb-1 text-xs font-medium text-gray-500'
                        key={`${model.type}-${model.value}`}
                      >
                        <ProviderName provideName={model.value} />
                      </div>
                    )
                  }

                  if (model.type === 'model') {
                    return (
                      <Popover.Button
                        key={`${model.providerName}-${model.value}`}
                        className={`${s.optionItem}
                        flex items-center px-3 w-full h-8 rounded-lg hover:bg-gray-50
                        ${!readonly ? 'cursor-pointer' : 'cursor-auto'}
                        ${(value?.providerName === model.providerName && value?.modelName === model.value) && 'bg-gray-50'}
                      `}
                        onClick={() => {
                          const selectedModel = modelList.find((item) => {
                            return item.model_name === model.value && item.model_provider.provider_name === model.providerName
                          })
                          onChange(selectedModel as BackendModel)
                        }}
                      >
                        <ModelIcon
                          className='mr-2 shrink-0'
                          modelId={model.value}
                          providerName={model.providerName}
                        />
                        <div className='mr-2 grow flex items-center text-left text-sm text-gray-900 truncate'>
                          <ModelName modelId={model.value} modelDisplayName={model.modelDisplayName} />
                          {isShowModelModeType && (
                            <ModelModeTypeLabel className={`${s.modelModeLabel} ml-2`} type={model.model_mode} />
                          )}
                        </div>
                        { (value?.providerName === model.providerName && value?.modelName === model.value) && <Check className='shrink-0 w-4 h-4 text-primary-600' /> }
                      </Popover.Button>
                    )
                  }

                  return null
                })
              }
              {modelList.length !== 0 && (search && filteredModelList.length === 0) && (
                <div className='px-3 pt-1.5 h-[30px] text-center text-xs text-gray-500'>{t('common.modelProvider.noModelFound', { model: search })}</div>
              )}

              {isShowAddModel && (
                <div
                  className='border-t flex items-center h-9 pl-3  text-xs text-[#155EEF] cursor-pointer'
                  style={{
                    borderColor: 'rgba(0, 0, 0, 0.05)',
                  }}
                  onClick={() => setShowAccountSettingModal({ payload: 'provider' })}
                >
                  <CubeOutline className='w-4 h-4 mr-2' />
                  <div>{t('common.model.addMoreModel')}</div>
                </div>
              )}
            </Popover.Panel>
          </Transition>
        )}
      </Popover>
      <ModelModal
        isShow={showRerankModal}
        modelModal={cohereConfig.modal}
        onCancel={() => setShowRerankModal(false)}
        onSave={handleRerankModalSave}
        mode={'add'}
      />
    </div>
  )
}

export default ModelSelector
