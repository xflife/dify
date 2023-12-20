'use client'
import React from 'react'
import type { FC } from 'react'
import Link from 'next/link'
import { WorkspaceProvider } from '@/context/workspace-context'
import AccountDropdown from '@/app/components/header/account-dropdown'
import { fetchAppDetail } from '@/service/apps'
import './style.css'

export type IAppDetailNavProps = {
  iconType?: 'app' | 'dataset'
  title: string
  desc: string
  navigation: Array<{
    name: string
    href: string
    icon: any
    selectedIcon: any
  }>
  extraInfo?: React.ReactNode
  layout: string
}

const sampleAppIconUrl = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
const databaseUrl = 'https://assets.metaio.cc/assets/difyassets/datas.png'
const appUrl = 'https://assets.metaio.cc/assets/difyassets/apps.png'
const logoUrl = 'https://assets.metaio.cc/assets/difyassets/biglogo.png'

const headerPreUrl = 'https://assets.metaio.cc/assets/difyassets/dify-header-'

const AppDetailNav: FC<IAppDetailNavProps> = ({
  title,
  desc,
  navigation,
  extraInfo,
  iconType = 'app',
  isChat,
  apps,
  noHeader,
  layout,
}: any) => {
  let userProfile
  let onLogout
  let langeniusVersionInfo
  if (!isChat && !noHeader && typeof window !== 'undefined' && window.APP) {
    userProfile = window.APP?.userProfile
    onLogout = window.APP?.onLogout
    langeniusVersionInfo = window.APP?.langeniusVersionInfo
  }

  const getAppInfoAndGo = async (appInfo: any) => {
    const data = await fetchAppDetail({ url: '/apps', id: appInfo.id })
    console.log(data)
    window.location.href = `${window.location.origin}/chat/${data.site.access_token}`
  }

  const pathname = (globalThis && globalThis.location) ? globalThis.location.pathname : '/datasets'
  return (
    <div
      className="flex flex-col overflow-y-auto bg-white border-r border-gray-200 w-17 shrink-0"
      style={{
        zIndex: 10,
        padding: '20px 0',
        width: 90,
        paddingTop: 0,
        paddingBottom: 0,
        boxShadow: '8px 0px 32px rgba(77, 90, 115, 0.08)',
        borderTopRightRadius: 16,
        borderBottomRightRadius: 16,
        background: 'none',
      }}
    >
      <div style={{ position: 'fixed', left: 0, top: 0, padding: '0 20px', background: 'white' }}>
        <div className='flex flex-col basic-sidebar' style={{ width: 70 }}>
          <img src={logoUrl} className='basic-sidebar-header' />
          {
            !isChat
              ? (
                <div className='basic-sidebar-menu'>
                  <Link href="/apps">
                    <div className={`basic-sidebar-menu-item ${layout === 'apps' ? 'active' : ''}`} style={{ color: 'white' }}>
                      <img className='basic-sidebar-menu-icon' src={appUrl} />
                      {
                        layout === 'apps' ? (<div>应<br />用</div>) : null
                      }
                    </div>
                  </Link>
                  <Link href="/datasets">
                    <div className={`basic-sidebar-menu-item ${layout === 'datasets' ? 'active' : ''}`} style={{ color: 'white' }}>
                      <img className='basic-sidebar-menu-icon' src={databaseUrl} />
                      {
                        layout === 'datasets' ? (<div>数<br />据<br />集</div>) : null
                      }
                    </div>
                  </Link>
                </div>
              )
              : (apps && apps.length)
                ? (
                  <div className='basic-sidebar-menu'>
                    {apps.map((appInfo: any, key: number) => (
                      <div key={key} style={{ cursor: 'pointer' }} onClick={() => getAppInfoAndGo(appInfo)}>
                        <div className="basic-sidebar-menu-item active">
                          {
                            <img className='basic-sidebar-menu-icon big' src={`${headerPreUrl + (Math.floor(Math.random() * 9) + 1)}.png`} />
                          }
                        </div>
                        <div style={{ textAlign: 'center' }} className='basic-sidebar-menu-item-title'>
                          {appInfo.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )
                : null
          }
          <div className='mt-auto mb-10'>
            <WorkspaceProvider>
              <AccountDropdown />
            </WorkspaceProvider>
          </div>
          {/* {
            !isChat && !noHeader ? (
              <WorkspaceProvider>
                <AccountDropdown userProfile={userProfile || {}} onLogout={onLogout} langeniusVersionInfo={langeniusVersionInfo} />
              </WorkspaceProvider>
            ) : null
          } */}
        </div>
      </div>
    </div>
  )
}

export default React.memo(AppDetailNav)
