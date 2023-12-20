'use client'
import type { FC } from 'react'
import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import useSWR from 'swr'
import { useTranslation } from 'react-i18next'
import {
  // CommandLineIcon,
  Squares2X2Icon,
  // eslint-disable-next-line sort-imports
  PuzzlePieceIcon,
} from '@heroicons/react/24/outline'

import Link from 'next/link'
import s from './style.module.css'
import { fetchDataDetail, fetchDatasetRelatedApps } from '@/service/datasets'
import type { RelatedApp } from '@/models/datasets'
import AppSideBar from '@/app/components/app-sidebar'
import Divider from '@/app/components/base/divider'
import Indicator from '@/app/components/header/indicator'
import AppIcon from '@/app/components/base/app-icon'
import Loading from '@/app/components/base/loading'
import DatasetDetailContext from '@/context/dataset-detail'
import { DataSourceType } from '@/models/datasets'

// import { fetchDatasetDetail } from '@/service/datasets'

export type IAppDetailLayoutProps = {
  children: React.ReactNode
  params: { datasetId: string }
}

const LikedItem: FC<{ type?: 'plugin' | 'app'; appStatus?: boolean; detail: RelatedApp }> = ({
  type = 'app',
  appStatus = true,
  detail,
}) => {
  return (
    <Link className={s.itemWrapper} href={`/app/${detail?.id}/overview`}>
      <div className={s.iconWrapper}>
        <AppIcon className='w-[24px] h-[24px]' size='tiny' />
        {type === 'app' && (
          <div className={s.statusPoint}>
            <Indicator color={appStatus ? 'green' : 'gray'} />
          </div>
        )}
      </div>
      <div className={s.appInfo}>{detail?.name || '--'}</div>
    </Link>
  )
}

const DatasetDetailLayout: FC<IAppDetailLayoutProps> = (props) => {
  const {
    children,
    params: { datasetId },
  } = props
  const pathname = usePathname()
  const hideSideBar = /documents\/create$/.test(pathname)
  const { t } = useTranslation()
  const { data: datasetRes, error, mutate: mutateDatasetRes } = useSWR({
    action: 'fetchDataDetail',
    datasetId,
  }, apiParams => fetchDataDetail(apiParams.datasetId))

  const { data: relatedApps } = useSWR({
    action: 'fetchDatasetRelatedApps',
    datasetId,
  }, apiParams => fetchDatasetRelatedApps(apiParams.datasetId))

  const navigation = [
    { name: '文档', href: `/datasets/${datasetId}/documents`, icon: <img width={24} height={24} src="https://assets.metaio.cc/assets/difyassets/data-wd.png" />, selectedIcon: <img width={24} height={24} src="https://assets.metaio.cc/assets/difyassets/ll.png" /> },
    { name: '召回测试', href: `/datasets/${datasetId}/hitTesting`, icon: <img width={24} height={24} src="https://assets.metaio.cc/assets/difyassets/data-mz.png" />, selectedIcon: <img width={24} height={24} src="https://assets.metaio.cc/assets/difyassets/wtxl.png" /> },
    { name: '设置', href: `/datasets/${datasetId}/settings`, icon: <img width={24} height={24} src="https://assets.metaio.cc/assets/difyassets/data-sz.png" />, selectedIcon: <img width={24} height={24} src="https://assets.metaio.cc/assets/difyassets/rzbj.png" /> },
  ]
  // const navigation = [
  //   { name: t('common.datasetMenus.documents'), href: `/datasets/${datasetId}/documents`, icon: DocumentTextIcon, selectedIcon: DocumentTextSolidIcon },
  //   { name: t('common.datasetMenus.hitTesting'), href: `/datasets/${datasetId}/hitTesting`, icon: TargetIcon, selectedIcon: TargetSolidIcon },
  //   // { name: 'api & webhook', href: `/datasets/${datasetId}/api`, icon: CommandLineIcon, selectedIcon: CommandLineSolidIcon },
  //   { name: t('common.datasetMenus.settings'), href: `/datasets/${datasetId}/settings`, icon: Cog8ToothIcon, selectedIcon: Cog8ToothSolidIcon },
  // ]

  useEffect(() => {
    if (datasetRes)
      document.title = `${datasetRes.name || 'Dataset'} - iPollo.AI`
  }, [datasetRes])

  const ExtraInfo: FC = () => {
    return <div className='w-full'>
      <Divider className='mt-5' />
      {relatedApps?.data?.length
        ? (
          <>
            <div className={s.subTitle}>{relatedApps?.total || '--'} {t('common.datasetMenus.relatedApp')}</div>
            {relatedApps?.data?.map((item, index) => (<LikedItem key={index} detail={item} />))}
          </>
        )
        : (
          <>
            <div className='p-3 mt-5'>
              <div className='flex items-center justify-start gap-2'>
                <div className={s.emptyIconDiv}>
                  <Squares2X2Icon className='w-3 h-3 text-gray-500' />
                </div>
                <div className={s.emptyIconDiv}>
                  <PuzzlePieceIcon className='w-3 h-3 text-gray-500' />
                </div>
              </div>
            </div>
            <div className='mt-2 text-xs text-gray-500' style={{ position: 'relative', left: 10 }}>{t('common.datasetMenus.emptyTip')}</div>
          </>
        )}
    </div >
  }

  if (!datasetRes && !error)
    return <Loading />

  return (
    <div className='flex' style={{ height: 'calc(100vh)' }}>
      {!hideSideBar && <AppSideBar
        title={datasetRes?.name || '--'}
        icon={datasetRes?.icon || 'https://static.dify.ai/images/dataset-default-icon.png'}
        icon_background={datasetRes?.icon_background || '#F5F5F5'}
        desc={datasetRes?.description || '--'}
        navigation={navigation}
        extraInfo={<ExtraInfo />}
        iconType={datasetRes?.data_source_type === DataSourceType.NOTION ? 'notion' : 'dataset'}
      />}
      <DatasetDetailContext.Provider value={{
        indexingTechnique: datasetRes?.indexing_technique,
        dataset: datasetRes,
        mutateDatasetRes: () => mutateDatasetRes(),
      }}>
        <div className="bg-white grow">{children}</div>
      </DatasetDetailContext.Provider>
    </div>
  )
}
export default React.memo(DatasetDetailLayout)
