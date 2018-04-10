import {
  getStatus,
  getStatusRaw,
  getStatusSpawn,
  getStatusSpawnRaw,
} from '../../src/lib/git'
import { Repository } from '../../src/models/repository'
import * as Path from 'path'

import * as heapdump from 'heapdump'

// hacks to get Benchmark working properly yaaaay
import _ from 'lodash'
import process from 'process'

const benchmark = require('benchmark')
const Benchmark = benchmark.runInContext({ _, process })
const hack = window as any
hack.Benchmark = Benchmark

const SLOW_TEST_RUN_COUNT = 10

async function timeSlowTest(context: string, action: () => Promise<any>) {
  const startTime = performance && performance.now ? performance.now() : null

  await action()

  if (startTime != null) {
    const rawTime = performance.now() - startTime
    const timeInSeconds = (rawTime / 1000).toFixed(3)
    console.log(`[${context}] took ${timeInSeconds}s`)
  } else {
    console.log(`[${context}] unable to measure performance of function`)
  }
}

const root = Path.dirname(Path.dirname(Path.dirname(__dirname)))
const dugitePath = Path.join(Path.dirname(root), 'dugite')
console.log(`dugite repo: ${dugitePath}`)

const dugiteRepo = new Repository(dugitePath, -1, null, false)

const classroomPath = Path.join(Path.dirname(root), 'classroom-desktop')

console.log(`github-classroom repo: ${classroomPath}`)

const classroomRepo = new Repository(classroomPath, -1, null, false)

describe('status benchmark', () => {
  describe('❗️  no working directory changes', () => {
    it('☝️  pass-thru from Node - no parsing', done => {
      const suite = new Benchmark.Suite('status')

      suite
        .add('GitProcess.exec', async function() {
          await getStatusRaw(dugiteRepo)
        })
        .add('GitProcess.spawn', async function() {
          await getStatusSpawnRaw(dugiteRepo)
        })
        .on('cycle', function(event: { target: any }) {
          console.log(String(event.target))
        })
        .on('complete', function(this: any) {
          console.log('Fastest is ' + this.filter('fastest').map('name'))
          done()
        })
        // run async
        .run({ async: true })
    })

    it('☝️  parsing output and generating objects', done => {
      const suite = new Benchmark.Suite('status')

      suite
        .add('GitProcess.exec', async function() {
          await getStatus(dugiteRepo)
        })
        .add('GitProcess.spawn', async function() {
          await getStatusSpawn(dugiteRepo)
        })
        .on('cycle', function(event: { target: any }) {
          console.log(String(event.target))
        })
        .on('complete', function(this: any) {
          console.log('Fastest is ' + this.filter('fastest').map('name'))
          done()
        })
        // run async
        .run({ async: true })
    })
  })

  describe('️❗️  33k untracked changes', () => {
    it('☝️  pass-thru from Node - no parsing', done => {
      const suite = new Benchmark.Suite('status')

      suite
        .add('GitProcess.exec (raw)', async function() {
          await getStatusRaw(classroomRepo)
        })
        .add('GitProcess.spawn (raw)', async function() {
          await getStatusSpawnRaw(classroomRepo)
        })
        .on('cycle', function(event: { target: any }) {
          console.log(String(event.target))
        })
        .on('complete', function(this: any) {
          console.log('Fastest is ' + this.filter('fastest').map('name'))
          done()
        })
        // run async
        .run({ async: true })
    })

    it('☝️  parsing output and generating objects - current approach', async () => {
      heapdump.writeSnapshot('exec-before.heapsnapshot', err => {
        if (err) {
          console.log(`couldn't write before snapshot`, err)
        }
      })

      for (let i = 0; i < SLOW_TEST_RUN_COUNT; i++) {
        await timeSlowTest('GitProcess.exec', () => getStatus(classroomRepo))
      }

      heapdump.writeSnapshot('exec-after.heapsnapshot', err => {
        if (err) {
          console.log(`couldn't write after snapshot`, err)
        }
      })
    })

    it('☝️  parsing output and generating objects - new spawn-based approach', async () => {
      heapdump.writeSnapshot('spawn-before.heapsnapshot', err => {
        if (err) {
          console.log(`couldn't write before snapshot`, err)
        }
      })

      for (let i = 0; i < SLOW_TEST_RUN_COUNT; i++) {
        await timeSlowTest('GitProcess.spawn', () =>
          getStatusSpawn(classroomRepo)
        )
      }

      heapdump.writeSnapshot('spawn-after.heapsnapshot', err => {
        if (err) {
          console.log(`couldn't write after snapshot`, err)
        }
      })
    })
  })
})
