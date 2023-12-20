'use client'
import type { FC } from 'react'
import React, { useEffect, useState } from 'react'
import useSWR from 'swr'
import dayjs from 'dayjs'
import Loading from '@/app/components/base/loading'
import {
  fetchAppDetail,
  getAppDailyConversations,
  getAppDailyEndUsers,
} from '@/service/apps'
import type { IToastProps } from '@/app/components/base/toast'
import './style.css'

export type ICardViewProps = {
  appId: string
}

type IParams = {
  url: string
  body?: Record<string, any>
}

export async function asyncRunSafe<T>(
  func: (val: IParams) => Promise<T>,
  params: IParams,
  callback: (props: IToastProps) => void,
  dict?: any,
): Promise<[string?, T?]> {
  try {
    const res = await func(params)
    callback
      && callback({
        type: 'success',
        message: dict('common.actionMsg.modifiedSuccessfully'),
      })
    return [undefined, res]
  }
  catch (err) {
    callback
      && callback({
        type: 'error',
        message: dict('common.actionMsg.modificationFailed'),
      })
    return [(err as Error).message, undefined]
  }
}

const CardView: FC<ICardViewProps> = ({ appId }) => {
  const detailParams = { url: '/apps', id: appId }
  const { data: response } = useSWR(detailParams, fetchAppDetail)

  const [todayNewUser, setTodayNewUser] = useState(0)
  const [allNewUser, setAllNewUser] = useState(0)
  const [todayNewConversation, setTodayNewConversation] = useState(0)
  const [allNewConversation, setAllNewConversation] = useState(0)
  const today = dayjs()
  const queryDateFormat = 'YYYY-MM-DD HH:mm'
  const todayPeriod = {
    start: today.subtract(1, 'day').format(queryDateFormat),
    end: today.format(queryDateFormat),
  }

  const getCardViewData = async () => {
    const getTodayNewUser = async () => {
      const url = `/apps/${appId}/statistics/daily-end-users`
      const params = todayPeriod
      const res = await getAppDailyEndUsers({
        url,
        params,
      })
      // console.log(res.data)
      if (res.data.length !== 0) {
        const totalCount = res.data.reduce(
          (total, item) => total + item.terminal_count,
          0,
        )
        setTodayNewUser(totalCount)
      }
      else {
        setTodayNewUser(0)
      }
    }
    const getAllNewUser = async () => {
      const url = `/apps/${appId}/statistics/daily-end-users`
      const res = await getAppDailyEndUsers({ url, params: {} })
      // console.log(res.data)
      if (res.data.length !== 0) {
        const totalCount = res.data.reduce(
          (total, item) => total + item.terminal_count,
          0,
        )
        setAllNewUser(totalCount)
      }
      else {
        setAllNewUser(0)
      }
    }
    const getTodayNewConversation = async () => {
      const url = `/apps/${appId}/statistics/daily-conversations`
      const params = todayPeriod
      const res = await getAppDailyConversations({
        url,
        params: todayPeriod,
      })
      // console.log(res.data)
      // setTodayNewConversation(res.data)
      if (res.data.length !== 0) {
        const totalCount = res.data.reduce(
          (total, item) => total + item.conversation_count,
          0,
        )
        setTodayNewConversation(totalCount)
      }
      else {
        setTodayNewUser(0)
      }
    }
    const getAllNewConversation = async () => {
      const url = `/apps/${appId}/statistics/daily-conversations`
      const res = await getAppDailyConversations({ url, params: {} })
      // console.log(res.data)
      // setAllNewConversation(res.data)
      if (res.data.length !== 0) {
        const totalCount = res.data.reduce(
          (total, item) => total + item.conversation_count,
          0,
        )
        setAllNewConversation(totalCount)
      }
      else {
        setAllNewUser(0)
      }
    }
    try {
      await getTodayNewUser()
      await getAllNewUser()
      await getTodayNewConversation()
      await getAllNewConversation()
    }
    catch (error) {
      console.log(error)
    }

    // if (!response) return <Loading />
    // const noDataFlag = !response.data || response.data.length === 0
  }

  useEffect(() => {
    const fetchData = () => {
      getCardViewData()
    }
    fetchData()
  }, [])

  if (!response)
    return <Loading />

  return (
    <div className="overview-4-card">
      <div className="card-line" style={{ marginBottom: 12 }}>
        <div style={{ marginRight: 12 }} className="card-item">
          <div style={{ background: '#e6eefc' }} className="card-icon-bg">
            <img
              src="https://assets.metaio.cc/assets/difyassets/xzyh.png"
              className="card-icon-img"
            />
          </div>
          <div>
            <p className="mb-0 card-num">{todayNewUser}</p>
            <p className="card-title">今日新增用户数</p>
          </div>
        </div>
        <div className="card-item">
          <div style={{ background: '#e1e3f5' }} className="card-icon-bg">
            <img
              src="https://assets.metaio.cc/assets/difyassets/ljyh.png"
              className="card-icon-img"
            />
          </div>
          <div>
            <p className="mb-0 card-num">{allNewUser}</p>
            <p className="card-title">累计用户数</p>
          </div>
        </div>
      </div>
      <div className="card-line">
        <div style={{ marginRight: 12 }} className="card-item">
          <div style={{ background: '#faf0ec' }} className="card-icon-bg">
            <img
              src="https://assets.metaio.cc/assets/difyassets/xzht.png"
              className="card-icon-img"
            />
          </div>
          <div>
            <p className="mb-0 card-num">{todayNewConversation}</p>
            <p className="card-title">今日新增话题数</p>
          </div>
        </div>
        <div className="card-item">
          <div style={{ background: '#ebf6ef' }} className="card-icon-bg">
            <img
              src="https://assets.metaio.cc/assets/difyassets/ljht.png"
              className="card-icon-img"
            />
          </div>
          <div>
            <p className="mb-0 card-num">{allNewConversation}</p>
            <p className="card-title">累计话题数</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CardView
