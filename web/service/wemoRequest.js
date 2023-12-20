import axios from 'axios'
import { userApiPrefix } from '@/config'

async function getHandle(type, data, headers) {
  const params = {
    method: 'get',
    url: userApiPrefix,
    params: {
      args: data,
      type,
    },
  }
  let wemoUser = window.localStorage.getItem('wemo_user')
  if (wemoUser) {
    wemoUser = JSON.parse(wemoUser)
    // window.location.href = window.location.origin + '/signin';
    params.headers = {
      Wemoflowauthorization: `Bearer ${wemoUser.token}`,
    }
  }
  if (headers)
    params.headers = { ...params.headers, ...headers }

  return axios(params)
}

async function postHandle(type, data, headers) {
  const params = {
    method: 'post',
    url: userApiPrefix,
    data: {
      args: data,
      type,
    },
  }
  let wemoUser = window.localStorage.getItem('wemo_user')
  if (wemoUser) {
    wemoUser = JSON.parse(wemoUser)
    // window.location.href = window.location.origin + '/signin';
    params.headers = {
      Wemoflowauthorization: `Bearer ${wemoUser.token}`,
    }
  }
  if (headers)
    params.headers = { ...params.headers, ...headers }

  console.log(params, 23232323)
  return axios(params)
}

export default {
  get: getHandle,
  post: postHandle,
}
