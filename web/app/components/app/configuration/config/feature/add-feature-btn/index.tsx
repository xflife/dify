'use client'
import type { FC } from 'react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { PlusIcon } from '@heroicons/react/24/solid'

export type IAddFeatureBtnProps = {
  onClick: () => void
}

const AddFeatureBtn: FC<IAddFeatureBtnProps> = ({
  onClick,
}) => {
  const { t } = useTranslation()
  return (
    <div
      className='flex items-center h-8 px-3 space-x-2 text-xs font-semibold uppercase border rounded-lg cursor-pointer  border-primary-100 bg-primary-25 hover:bg-primary-50 text-primary-600'
      style={{
        boxShadow: '0px 4px 8px -2px rgba(16, 24, 40, 0.1), 0px 2px 4px -2px rgba(16, 24, 40, 0.06)',
        background: '#181A24',
        color: 'white',
        borderRadius: 1000,
      }}
      onClick={onClick}
    >
      <PlusIcon className='w-4 h-4 font-semibold' />
      <div>{t('appDebug.operation.addFeature')}</div>
    </div>
  )
}
export default React.memo(AddFeatureBtn)
