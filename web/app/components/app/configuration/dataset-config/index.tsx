'use client'
import type { FC } from 'react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useContext } from 'use-context-selector'
import produce from 'immer'
import FeaturePanel from '../base/feature-panel'
import OperationBtn from '../base/operation-btn'
import CardItem from './card-item/item'
import ParamsConfig from './params-config'
import ContextVar from './context-var'
import ConfigContext from '@/context/debug-configuration'
import { AppType } from '@/types/app'
import type { DataSet } from '@/models/datasets'

const DatasetConfig: FC = () => {
  const { t } = useTranslation()
  const {
    mode,
    dataSets: dataSet,
    setDataSets: setDataSet,
    setFormattingChanged,
    modelConfig,
    setModelConfig,
    showSelectDataSet,
  } = useContext(ConfigContext)

  const hasData = dataSet.length > 0

  const onRemove = (id: string) => {
    setDataSet(dataSet.filter(item => item.id !== id))
    setFormattingChanged(true)
  }

  const handleSave = (newDataset: DataSet) => {
    const index = dataSet.findIndex(item => item.id === newDataset.id)

    setDataSet([...dataSet.slice(0, index), newDataset, ...dataSet.slice(index + 1)])
    setFormattingChanged(true)
  }

  const promptVariables = modelConfig.configs.prompt_variables
  const promptVariablesToSelect = promptVariables.map(item => ({
    name: item.name,
    type: item.type,
    value: item.key,
  }))
  const selectedContextVar = promptVariables?.find(item => item.is_context_var)
  const handleSelectContextVar = (selectedValue: string) => {
    const newModelConfig = produce(modelConfig, (draft) => {
      draft.configs.prompt_variables = modelConfig.configs.prompt_variables.map((item) => {
        return ({
          ...item,
          is_context_var: item.key === selectedValue,
        })
      })
    })
    setModelConfig(newModelConfig)
  }

  return (
    <FeaturePanel
      className='mt-3'
      headerIcon={<img className='w-3.5 h-3.5' src="https://assets.metaio.cc/assets/difyassets/sxw.png" />}
      title={t('appDebug.feature.dataSet.title')}
      headerRight={
        <div className='flex items-center gap-1'>
          <ParamsConfig />
          <OperationBtn type="add" onClick={showSelectDataSet} />
        </div>
      }
      hasHeaderBottomBorder={!hasData}
      noBodySpacing
    >
      {hasData
        ? (
          <div className='flex flex-wrap justify-between px-3 pb-3 mt-1'>
            {dataSet.map(item => (
              <CardItem
                key={item.id}
                config={item}
                onRemove={onRemove}
                onSave={handleSave}
              />
            ))}
          </div>
        )
        : (
          <div className='px-3 pb-3 mt-1'>
            <div className='pt-2 pb-1 text-xs text-gray-500'>{t('appDebug.feature.dataSet.noData')}</div>
          </div>
        )}

      {mode === AppType.completion && dataSet.length > 0 && (
        <ContextVar
          value={selectedContextVar?.key}
          options={promptVariablesToSelect}
          onChange={handleSelectContextVar}
        />
      )}
    </FeaturePanel>
  )
}
export default React.memo(DatasetConfig)
