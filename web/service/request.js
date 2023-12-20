import axios from 'axios'

async function getHandle(path, data, headers) {
  const params = {
    method: 'get',
    url: `https://chain.metaio.cc${path}`,
    params: data,
  }
  if (headers)
    params.headers = headers

  return axios(params)
}

async function postHandle(path, data, headers) {
  const params = {
    method: 'post',
    url: `https://chain.metaio.cc${path}`,
    data,
  }
  if (headers)
    params.headers = headers

  return axios(params)
}

export default {
  get: getHandle,
  post: postHandle,
}
