import wemoRequest from './wemoRequest'

export const getTeams = async () => {
  const result = await wemoRequest.post('myTeams', {})
  if (result.data.errCode === 0)
    return result.data.data

  throw new Error(result.data)
}

export const getApps = async (teamId) => {
  const result = await wemoRequest.post('getApps', {
    teamId,
  })
  if (result.data.errCode === 0)
    return result.data.apps

  throw new Error(result.data)
}

export const getModules = async (teamId, appId) => {
  const result = await wemoRequest.post('getModules', {
    teamId,
    appId,
  })
  if (result.data.errCode === 0)
    return result.data.modules

  throw new Error(result.data)
}

export const getModuleDetails = async (teamId, appId, moduleId) => {
  const result = await wemoRequest.post('getModuleDetails', {
    teamId,
    appId,
    moduleId,
  })
  if (result.data.errCode === 0)
    return result.data.module

  throw new Error(result.data)
}

export const getAllPlugins = async () => {
  const plugins = []
  const teams = await getTeams()
  const teamIds = teams.map(item => item.teamId)
  for (let i = 0; i < teamIds.length; i++) {
    const apps = await getApps(teamIds[i])
    for (let j = 0; j < apps.length; j++) {
      const modules = await getModules(teamIds[i], apps[j].appId)
      for (let x = 0; x < modules.length; x++) {
        const plugin = await getModuleDetails(teamIds[i], apps[j].appId, modules[x].moduleId)
        plugin.input = JSON.parse(plugin.input)
        plugins.push(plugin)
      }
    }
  }
  return plugins
}
