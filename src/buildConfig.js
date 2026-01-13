import { get, merge } from 'lodash'

class BuildConfig {
  defaultConfig = {
    stadium: {
      scheme_type: 'svg'
    }
  }

  constructor(config = {}) {
    this.config = merge(this.defaultConfig, config)
  }

  getPath(path) {
    return get(this.config, path)
  }

  getPaths(pathMap, prepend = []) {
    return Object.keys(pathMap).reduce((acc, key) => {
      const path = [].concat(prepend, pathMap[key])
      acc[key] = this.getPath(path)
      return acc
    }, {})
  }
}

const buildConfig = new BuildConfig({})

export default buildConfig