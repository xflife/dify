import 'antd/dist/antd.css'
import React, { useEffect, useState } from 'react'
import { Button, Input, Modal } from 'antd'
import Panel from '../base/feature-panel'
import OperationBtn from '../base/operation-btn'

import s from './index.module.css'
import './styles.css'

import edite from './assets/edite.png'
import deletePic from './assets/delete.png'
import add from './assets/add.png'

import defaultPlugins from './defaultPlugins'
// import Button from '@/app/components/base/button'
// import Input from '@/app/components/base/input'
// import Modal from '@/app/components/base/modal'
import {
  getAllPlugins,
} from '@/service/wemo'

const mock = [1, 2, 3, 4, 5]

let id = 1
let inited = false

const ConfigPlugn = ({ defaultStrategy, saveStrategy }) => {
  // ========================= STATES =========================
  const [plugins, setPlugins] = useState([])
  const [showPlugins, setShowPlugins] = useState([])
  const [strategy, setStrategy] = useState(defaultStrategy || [])
  const [currentStrategy, setCurrentStrategy] = useState('')
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [visibleConfig, setVisibleConfig] = useState(false)
  const [currentPluginConfig, setCurrentPluginConfig] = useState(null)

  const setStrategyHandle = (data) => {
    setStrategy(data)
    saveStrategy(data)
  }

  // ========================= HANDLES =========================
  const getPlugins = async () => {
    try {
      const allPlugins = await getAllPlugins()
      allPlugins.forEach((plugin) => {
        if (plugin.input && plugin.input.properties && plugin.input.properties.length) {
          plugin.input.properties.forEach((item) => {
            item.useUserInput = true
          })
        }
      })
      const _plugins = JSON.parse(JSON.stringify(allPlugins))
      setShowPlugins(JSON.parse(JSON.stringify([...defaultPlugins, ..._plugins])))
      setPlugins(JSON.parse(JSON.stringify([...defaultPlugins, ..._plugins])))
    }
    catch (e) {
      setShowPlugins(JSON.parse(JSON.stringify([...defaultPlugins])))
      setPlugins(JSON.parse(JSON.stringify([...defaultPlugins])))
    }
  }

  const addStrategy = () => {
    const newStrategy = {
      id: `${id}`,
      name: `策略${strategy.length + 1}`,
      prompt: '',
      plugins: [],
      disabledName: true,
    }
    setStrategyHandle([...strategy, newStrategy])
  }

  const deleteStrategy = (item, index) => {
    const newStrategy = [...strategy]
    newStrategy.splice(index, 1)
    setStrategyHandle(newStrategy)
  }

  const editeStrategyName = (item, index) => {
    item.disabledName = !item.disabledName
    setStrategyHandle([...strategy])
  }

  const changeStrategyName = (e, item) => {
    item.name = e.target.value
    setStrategyHandle([...strategy])
  }

  const addPluginByStrategy = (item, index) => {
    setCurrentStrategy(item.id)
    setTimeout(() => {
      setVisible(true)
      setLoading(true)
    })
  }

  const handleOk = () => {
    const selectedPlugins = showPlugins.filter(item => item.selected)
    const current = strategy.find(item => item.id === currentStrategy)
    if (current)
      current.plugins = selectedPlugins

    setStrategyHandle([...strategy])
    setVisible(false)
  }
  const handleCancel = () => setVisible(false)

  const selectPlugin = (item) => {
    item.selected = !item.selected
    setShowPlugins([...showPlugins])
  }

  const promptOnChange = (e, item) => {
    item.prompt = e.target.value
    setStrategyHandle([...strategy])
  }

  const configPlugin = (plugin) => {
    setCurrentPluginConfig(plugin)
    setVisibleConfig(true)
  }

  const handlePluginOk = () => {
    setCurrentPluginConfig(null)
    setVisibleConfig(false)
    setStrategy([...strategy])
  }

  const handlePluginCancel = () => setVisibleConfig(false)

  const handlePluginPropertysChange = (e, property) => {
    const value = e.target.value
    property.value = value
    setCurrentPluginConfig({ ...currentPluginConfig })
  }

  const handleUseUserInput = (property) => {
    property.useUserInput = !property.useUserInput
    setCurrentPluginConfig({ ...currentPluginConfig })
  }

  // ========================= EFFECTS =========================

  useEffect(() => {
    // const wemo_user = window.localStorage.getItem('wemo_user')
    // if (wemo_user) {
    getPlugins()
    // }
    return () => {
      inited = false
    }
  }, [])

  useEffect(() => {
    if (defaultStrategy?.length && !inited) {
      setStrategy(defaultStrategy)
      inited = true
      id = defaultStrategy.length + 1
    }
  }, [defaultStrategy])

  // ========================= RENDER =========================

  return (
    <>
      <Panel
        className="mt-4"
        headerIcon={
          <img src="https://assets.metaio.cc/assets/difyassets/cl.png" width={14} height={14} style={{ height: 14, position: 'relative' }} />
        }
        title={
          <div className='flex items-center gap-2'>
            <div>策略</div>
            <a style={{ color: 'black' }} href='http://wemo-plugin.metaio.cc/#/app/list' target="_blank">插件管理</a>
          </div>
        }
        headerRight={<OperationBtn type="add" onClick={addStrategy} />}
      >
        {!strategy.length && <div className='text-xs text-gray-500'>策略能使AI根据指定场景调度插件应用，以获得更精准的数据回答用户问题。</div>}
        {
          strategy.map((item, index) => (
            <div className={s.Plugin} key={item.name + index}>
              <div className={s.PluginTitleLayout}>
                <input
                  disabled={item.disabledName}
                  className={s.PluginTitle}
                  onBlur={e => changeStrategyName(e, item)}
                  defaultValue={item.name}
                />
                <div className={s.PluginTitleEditor}>
                  <img src={edite.src} onClick={() => editeStrategyName(item, index)} />
                  <div className={s.PluginTitleCertical} />
                  <img src={deletePic.src} onClick={() => deleteStrategy(item, index)} />
                </div>
              </div>
              <textarea defaultValue={item.prompt} onChange={e => promptOnChange(e, item)} className={`${s.PluginTextArea} text-xs`} placeholder='撰写提示词，AI会根据提示词要求调度插件。例：当我需要联网查询数据时，调用此插件。提示词越详细和精准越好。' />
              <div className={s.PluginListContainer}>
                {
                  item.plugins.map(plugin => (
                    <div key={plugin.moduleId} className={s.PluginListItem} onClick={() => configPlugin(plugin)}>
                      <div className={s.PluginItemIcon}>{plugin.name.slice(0, 1)}</div>
                      <span>{plugin.name}</span>
                    </div>
                  ))
                }
                <div
                  onClick={() => addPluginByStrategy(item, index)}
                  className={s.PluginListItem}
                >
                  <img src={add.src} className={s.PluginListItemPic} /><span>添加插件</span>
                </div>
              </div>
            </div>
          ))
        }

      </Panel>
      <Modal
        destroyOnClose
        width={668}
        title="插件市场"
        open={visible}
        onCancel={handleCancel}
        footer={<div>
          <Button
            style={{ borderRadius: 1000, background: 'black', color: 'white', width: 124 }}
            onClick={handleOk}
          >
                        确认
          </Button>
        </div>}
      >
        <div className={s.PluginMarket}>
          {
            showPlugins.length
              ? showPlugins.map((item, index) => (
                <div
                  className={`${s.PluginMarketItem} ${item.selected ? s.PluginMarketItemSelected : ''}`}
                  key={index}
                  onClick={() => selectPlugin(item)}
                >
                  {/* <img className={s.PluginMarketIcon} /> */}
                  <span className={s.PluginMarketIcon}>{item.name.slice(0, 1)}</span>
                  <div className={s.PluginMarketInfo}>
                    <div className={s.PluginMarketTitle}>{item.name}</div>
                    <div className={s.PluginMarketDescribe}>{item.description || '插件详情未填写'}</div>
                  </div>
                </div>
              ))
              : (
                <div>
                 您还没有可用的插件，去<a style={{ color: 'black', fontWeight: 600 }} href='http://wemo-plugin.metaio.cc/#/app/list' target="_blank">插件中心</a>查看并创建插件
                </div>
              )
          }
        </div>
      </Modal>
      <Modal
        open={visibleConfig}
        onCancel={handlePluginCancel}
        footer={<div>
          <Button
            style={{ borderRadius: 1000, background: 'black', color: 'white', width: 124 }}
            onClick={handlePluginOk}
          >
                        确认
          </Button>
        </div>}
      >
        <div className={s.PluginConfigTitle}>插件配置</div>
        {
          currentPluginConfig && currentPluginConfig.input.properties.length && currentPluginConfig.input.properties.map((property, key) => property.hidden
            ? null
            : (
              <div className={s.PluginConfig} key={key} >
                <div className={s.PluginConfigLabel}>{property.displayName}</div>
                <div className={s.PluginConfigContainer}>
                  <Input value={!property.useUserInput ? (property.value || '') : '使用用户输入'} disabled={property.useUserInput} onChange={v => handlePluginPropertysChange(v, property)} className={s.PluginConfigInput} />
                  <Button styles={{ width: 84 }} onClick={() => handleUseUserInput(property)} className={s.PluginConfigBtn}>{property.useUserInput ? '自定义' : '使用用户输入'}</Button>
                </div>
              </div>
            ))
        }
      </Modal>
    </>
  )
}

export default React.memo(ConfigPlugn)
