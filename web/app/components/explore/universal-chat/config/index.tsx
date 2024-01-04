'use client'
import type { FC } from 'react'
import React from 'react'
import ModelConfig from './model-config'
import DataConfig from './data-config'
import PluginConfig from './plugins-config'
import type { DataSet } from '@/models/datasets'

export type IConfigProps = {
  className?: string
  readonly?: boolean
  modelId: string
  providerName: string
  onModelChange?: (modelId: string, providerName: string) => void
  plugins: Record<string, boolean>
  onPluginChange?: (key: string, value: boolean) => void
  dataSets: DataSet[]
  onDataSetsChange?: (contexts: DataSet[]) => void
}

const Config: FC<IConfigProps> = ({
  className,
  readonly,
  modelId,
  providerName,
  onModelChange,
  plugins,
  onPluginChange,
  dataSets,
  onDataSetsChange,
}) => {
  return (
    <div className={className}>
      <ModelConfig
        readonly={readonly}
        modelId={modelId}
        providerName={providerName}
        onChange={onModelChange}
      />
      <PluginConfig
        readonly={readonly}
        config={plugins}
        onChange={onPluginChange}
      />
      {(!readonly || (readonly && dataSets.length > 0)) && (
        <DataConfig
          readonly={readonly}
          dataSets={dataSets}
          onChange={onDataSetsChange}
        />
      )}
    </div>
  )
}
export default React.memo(Config)
