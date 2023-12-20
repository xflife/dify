/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client'
import type { FC } from 'react'
import React, { useEffect, useState } from 'react'
import cn from 'classnames'
import useSWR from 'swr'
import { useTranslation } from 'react-i18next'

import s from './style.module.css'
import AppSideBar from '@/app/components/app-sidebar'
import { fetchAppDetail } from '@/service/apps'
import { useAppContext } from '@/context/app-context'
import fwapi from '@/app/assets/fwapi.png'

export type IAppDetailLayoutProps = {
  children: React.ReactNode
  params: { appId: string }
}

const AppDetailLayout: FC<IAppDetailLayoutProps> = (props) => {
  const {
    children,
    params: { appId }, // get appId in path
  } = props
  const { t } = useTranslation()
  const { isCurrentWorkspaceManager } = useAppContext()
  const detailParams = { url: '/apps', id: appId }
  const { data: response } = useSWR(detailParams, fetchAppDetail)

  const defaultNavItem: any = [
    {
      name: t('common.appMenus.overview'),
      href: `/app/${appId}/overview`,
      icon: (
        <img
          width={24}
          height={24}
          src="https://assets.metaio.cc/assets/difyassets/ll.png"
        />
      ),
      selectedIcon: (
        <img
          width={24}
          height={24}
          src="https://assets.metaio.cc/assets/difyassets/ll.png"
        />
      ),
    },
    {
      name: t('common.appMenus.promptEng'),
      href: `/app/${appId}/configuration`,
      icon: (
        <img
          width={24}
          height={24}
          src="https://assets.metaio.cc/assets/difyassets/wtxl.png"
        />
      ),
      selectedIcon: (
        <img
          width={24}
          height={24}
          src="https://assets.metaio.cc/assets/difyassets/wtxl.png"
        />
      ),
    },
    {
      name: t('common.appMenus.logAndAnn'),
      href: `/app/${appId}/logs`,
      icon: (
        <img
          width={24}
          height={24}
          src="https://assets.metaio.cc/assets/difyassets/rzbj.png"
        />
      ),
      selectedIcon: (
        <img
          width={24}
          height={24}
          src="https://assets.metaio.cc/assets/difyassets/rzbj.png"
        />
      ),
    },
    {
      name: t('common.appMenus.apiAccess'),
      href: `/app/${appId}/develop`,
      icon: <img width={24} height={24} src={fwapi.src} />,
      selectedIcon: <img width={24} height={24} src={fwapi.src} />,
    },
  ]

  const [navigation, setNavigation] = useState(defaultNavItem)

  // const navigation = useMemo(() => {
  // const navs = [
  //   { name: t('common.appMenus.overview'), href: `/app/${appId}/overview`, icon: ChartBarSquareIcon, selectedIcon: ChartBarSquareSolidIcon },
  //   ...(isCurrentWorkspaceManager ? [{ name: t('common.appMenus.promptEng'), href: `/app/${appId}/configuration`, icon: Cog8ToothIcon, selectedIcon: Cog8ToothSolidIcon }] : []),
  //   { name: t('common.appMenus.apiAccess'), href: `/app/${appId}/develop`, icon: CommandLineIcon, selectedIcon: CommandLineSolidIcon },
  //   { name: t('common.appMenus.logAndAnn'), href: `/app/${appId}/logs`, icon: DocumentTextIcon, selectedIcon: DocumentTextSolidIcon },
  // ]
  // return navs
  // }, [appId, isCurrentWorkspaceManager, t])

  const appModeName = response?.mode?.toUpperCase() === 'COMPLETION' ? t('common.appModes.completionApp') : t('common.appModes.chatApp')
  useEffect(() => {
    if (response?.name)
      document.title = `${(response.name || 'App')} - iPollo.AI`
  }, [response])
  if (!response)
    return null
  return (
    <div className={cn(s.app, 'flex', 'overflow-hidden')}>
      <AppSideBar title={response.name} icon={response.icon} icon_background={response.icon_background} desc={appModeName} navigation={navigation} />
      <div className="overflow-hidden bg-white grow">{children}</div>
    </div>
  )
}
export default React.memo(AppDetailLayout)
