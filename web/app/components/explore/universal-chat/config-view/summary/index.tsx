'use client'
import type { FC } from 'react'
import React from 'react'
import cn from 'classnames'
import { useBoolean, useClickAway } from 'ahooks'
import s from './style.module.css'
import ModelIcon from '@/app/components/header/account-setting/model-provider-page/model-icon'
import ModelName from '@/app/components/header/account-setting/model-provider-page/model-name'
import { Google, WebReader, Wikipedia } from '@/app/components/base/icons/src/public/plugins'
import ConfigDetail from '@/app/components/explore/universal-chat/config-view/detail'
import type { DataSet } from '@/models/datasets'
import { useAgentThoughtCurrentProviderAndModelAndModelList } from '@/app/components/header/account-setting/model-provider-page/hooks'

export type ISummaryProps = {
  modelId: string
  providerName: string
  plugins: Record<string, boolean>
  dataSets: DataSet[]
}

const getColorInfo = (modelId: string) => {
  if (modelId === 'gpt-4')
    return s.gpt4

  if (modelId === 'claude-2')
    return s.claude

  return s.gpt3
}

const getPlugIcon = (pluginId: string) => {
  const className = 'w-4 h-4'
  switch (pluginId) {
    case 'google_search':
      return <Google className={className} />
    case 'web_reader':
      return <WebReader className={className} />
    case 'wikipedia':
      return <Wikipedia className={className} />
    default:
      return null
  }
}

const Summary: FC<ISummaryProps> = ({
  modelId,
  providerName,
  plugins,
  dataSets,
}) => {
  const {
    currentModel: currModel,
    currentProvider,
  } = useAgentThoughtCurrentProviderAndModelAndModelList(
    { provider: providerName, model: modelId },
  )
  // current_datetime is not configable and do not have icon
  const pluginIds = Object.keys(plugins).filter(key => plugins[key] && key !== 'current_datetime')
  const [isShowConfig, { setFalse: hideConfig, toggle: toggleShowConfig }] = useBoolean(false)
  const configContentRef = React.useRef(null)

  useClickAway(() => {
    hideConfig()
  }, configContentRef)
  return (
    <div ref={configContentRef} className='relative'>
      <div onClick={toggleShowConfig} className={cn(getColorInfo(modelId), 'flex items-center px-1 h-8 rounded-lg border cursor-pointer')}>
        <ModelIcon
          provider={currentProvider}
          modelName={currModel?.model}
          className='!w-6 !h-6'
        />
        <div className='ml-2 text-[13px] font-medium text-gray-900'>
          <ModelName
            modelItem={currModel!}
          />
        </div>
        {
          pluginIds.length > 0 && (
            <div className='ml-1.5 flex items-center'>
              <div className='mr-1 h-3 w-[1px] bg-[#000] opacity-[0.05]'></div>
              <div className='flex space-x-1'>
                {pluginIds.map(pluginId => (
                  <div
                    key={pluginId}
                    className={`flex items-center justify-center w-6 h-6 rounded-md ${s.border} bg-white`}
                  >
                    {getPlugIcon(pluginId)}</div>
                ))}
              </div>
            </div>
          )
        }
      </div>
      {isShowConfig && (
        <ConfigDetail
          modelId={modelId}
          providerName={providerName}
          plugins={plugins}
          dataSets={dataSets}
        />
      )}
    </div>

  )
}
export default React.memo(Summary)
