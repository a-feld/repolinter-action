import {Inputs, Outputs} from '../src/inputs'
import run from '../src/main'
import * as path from 'path'
import nock from 'nock'
import * as fs from 'fs'
import {lint, jsonFormatter} from 'repolinter'

function getInputName(input: string): string {
  return `INPUT_${input.replace(/ /g, '_').toUpperCase()}`
}

function getOutputs(input: string[]): {[key: string]: string} {
  const OUTPUT_REGEX = /^::set-output\s+name=([a-z0-9\-_]+)::([^\r\n]+)$/gim
  const str = input.join('')
  const out: {[key: string]: string} = {}
  let match
  while ((match = OUTPUT_REGEX.exec(str)) !== null) {
    if (typeof match[1] === 'string' && typeof match[2] === 'string')
      out[match[1]] = match[2]
  }
  return out
}

describe('main', () => {
  let spooledStdout: string[] = []

  jest.setTimeout(30000)

  beforeEach(() => {
    // reset process.env
    process.env = {}
    // reset inputs
    process.env[getInputName(Inputs.REPO)] = 'newrelic/repolinter-action'
    process.env[getInputName(Inputs.OUTPUT_TYPE)] = 'exit-code'
    process.env[getInputName(Inputs.OUTPUT_NAME)] = 'Open Source Policy Issues'
    process.env[getInputName(Inputs.LABEL_NAME)] = 'repolinter'
    process.env[getInputName(Inputs.LABEL_COLOR)] = 'fbca04'
    process.env[getInputName(Inputs.USERNAME)] = 'my-user'
    process.env['GITHUB_ACTION'] = 'true'
    // disable STDOUT printing for now
    spooledStdout = []
    jest.spyOn(process.stdout, 'write').mockImplementation(str => {
      if (str instanceof Uint8Array)
        spooledStdout.push(new TextDecoder('utf-8').decode(str))
      else spooledStdout.push(str)
      return true
    })
  })

  test('throws when no token is supplied and output-type is not off', async () => {
    process.env[getInputName(Inputs.OUTPUT_TYPE)] = 'issue'

    await run()
    const outputs = getOutputs(spooledStdout)

    // console.debug(out)
    expect(outputs[Outputs.ERRORED]).toEqual('true')
    expect(outputs[Outputs.PASSED]).toEqual('false')
    expect(process.exitCode).not.toEqual(0)
  })

  test('throws when an invalid token is supplied and output-type is not off', async () => {
    process.env['GITHUB_TOKEN'] = '2'
    process.env[getInputName(Inputs.OUTPUT_TYPE)] = 'issue'

    await run()
    const outputs = getOutputs(spooledStdout)

    // console.debug(out)
    expect(outputs[Outputs.ERRORED]).toEqual('true')
    expect(outputs[Outputs.PASSED]).toEqual('false')
    expect(process.exitCode).not.toEqual(0)
  })

  test('throws when an invalid is supplied in TOKEN and output-type is not off', async () => {
    process.env[getInputName(Inputs.TOKEN)] = '2'
    process.env[getInputName(Inputs.OUTPUT_TYPE)] = 'issue'

    await run()
    const outputs = getOutputs(spooledStdout)

    // console.debug(out)
    expect(outputs[Outputs.ERRORED]).toEqual('true')
    expect(outputs[Outputs.PASSED]).toEqual('false')
    expect(process.exitCode).not.toEqual(0)
  })

  test('throws when no username is supplied', async () => {
    process.env[getInputName(Inputs.TOKEN)] = '2'
    process.env[getInputName(Inputs.OUTPUT_TYPE)] = 'issue'
    delete process.env[getInputName(Inputs.USERNAME)]

    await run()
    const outputs = getOutputs(spooledStdout)

    // console.debug(out)
    expect(outputs[Outputs.ERRORED]).toEqual('true')
    expect(outputs[Outputs.PASSED]).toEqual('false')
    expect(process.exitCode).not.toEqual(0)
  })

  test('throws when no output-type is supplied', async () => {
    delete process.env[getInputName(Inputs.OUTPUT_TYPE)]

    await run()
    const outputs = getOutputs(spooledStdout)

    // console.debug(out)
    expect(outputs[Outputs.ERRORED]).toEqual('true')
    expect(outputs[Outputs.PASSED]).toEqual('false')
    expect(process.exitCode).not.toEqual(0)
  })

  test('throws when an invalid output-type is supplied', async () => {
    process.env[getInputName(Inputs.OUTPUT_TYPE)] = 'string-cheese'

    await run()
    const outputs = getOutputs(spooledStdout)

    // console.debug(out)
    expect(outputs[Outputs.ERRORED]).toEqual('true')
    expect(outputs[Outputs.PASSED]).toEqual('false')
    expect(process.exitCode).not.toEqual(0)
  })

  test('throws when no output-name is supplied', async () => {
    delete process.env[getInputName(Inputs.OUTPUT_NAME)]

    await run()
    const outputs = getOutputs(spooledStdout)

    // console.debug(out)
    expect(outputs[Outputs.ERRORED]).toEqual('true')
    expect(outputs[Outputs.PASSED]).toEqual('false')
    expect(process.exitCode).not.toEqual(0)
  })

  test('throws when no repository is supplied', async () => {
    delete process.env[getInputName(Inputs.REPO)]

    await run()
    const outputs = getOutputs(spooledStdout)

    // console.debug(out)
    expect(outputs[Outputs.ERRORED]).toEqual('true')
    expect(outputs[Outputs.PASSED]).toEqual('false')
    expect(process.exitCode).not.toEqual(0)
  })

  test('throws when an invalid config-url is specified', async () => {
    process.env[getInputName(Inputs.CONFIG_URL)] = 'notadomain'

    await run()
    const outputs = getOutputs(spooledStdout)

    // console.debug(out)
    expect(outputs[Outputs.ERRORED]).toEqual('true')
    expect(outputs[Outputs.PASSED]).toEqual('false')
    expect(process.exitCode).not.toEqual(0)
  })

  test('throws when no label name is specified', async () => {
    delete process.env[getInputName(Inputs.LABEL_NAME)]

    await run()
    const outputs = getOutputs(spooledStdout)

    // console.debug(out)
    expect(outputs[Outputs.ERRORED]).toEqual('true')
    expect(outputs[Outputs.PASSED]).toEqual('false')
    expect(process.exitCode).not.toEqual(0)
  })

  test('throws when an invalid label name is specified', async () => {
    process.env[getInputName(Inputs.LABEL_NAME)] = ''

    await run()
    const outputs = getOutputs(spooledStdout)

    // console.debug(out)
    expect(outputs[Outputs.ERRORED]).toEqual('true')
    expect(outputs[Outputs.PASSED]).toEqual('false')
    expect(process.exitCode).not.toEqual(0)
  })

  test('throws when no label color is specified', async () => {
    delete process.env[getInputName(Inputs.LABEL_COLOR)]

    await run()
    const outputs = getOutputs(spooledStdout)

    // console.debug(out)
    expect(outputs[Outputs.ERRORED]).toEqual('true')
    expect(outputs[Outputs.PASSED]).toEqual('false')
    expect(process.exitCode).not.toEqual(0)
  })

  test('throws when an invalid label color is specified', async () => {
    process.env[getInputName(Inputs.LABEL_COLOR)] = 'notacolor'

    await run()
    const outputs = getOutputs(spooledStdout)

    // console.debug(out)
    expect(outputs[Outputs.ERRORED]).toEqual('true')
    expect(outputs[Outputs.PASSED]).toEqual('false')
    expect(process.exitCode).not.toEqual(0)
  })

  test('throws when no repository is supplied', async () => {
    delete process.env[getInputName(Inputs.REPO)]

    await run()
    const outputs = getOutputs(spooledStdout)

    // console.debug(out)
    expect(outputs[Outputs.ERRORED]).toEqual('true')
    expect(outputs[Outputs.PASSED]).toEqual('false')
    expect(process.exitCode).not.toEqual(0)
  })

  test('runs a failing file config', async () => {
    const configPath = path.resolve(__dirname, 'testconfig.json')
    process.env[getInputName(Inputs.CONFIG_FILE)] = configPath

    const expected = JSON.parse(
      jsonFormatter.formatOutput(
        await lint(
          '.',
          undefined,
          JSON.parse(await fs.promises.readFile(configPath, 'utf8')),
          true
        ),
        true
      )
    )

    await run()
    const outputs = getOutputs(spooledStdout)

    // console.debug(out)
    expect(outputs[Outputs.ERRORED]).toEqual('false')
    expect(outputs[Outputs.PASSED]).toEqual('false')
    expect(JSON.parse(outputs[Outputs.JSON_OUTPUT])).toMatchObject(expected)
    expect(process.exitCode).not.toEqual(0)
  })

  test('runs a failing URL config', async () => {
    const configPath = path.resolve(__dirname, 'testconfig.json')
    process.env[getInputName(Inputs.CONFIG_URL)] =
      'https://raw.githubusercontent.com/aperture-science-incorporated/.github/master/repolinter.json'

    nock('https://raw.githubusercontent.com')
      .get('/aperture-science-incorporated/.github/master/repolinter.json')
      .replyWithFile(200, configPath)

    const expected = jsonFormatter.formatOutput(
      await lint(
        '.',
        undefined,
        JSON.parse(await fs.promises.readFile(configPath, 'utf8')),
        true
      ),
      true
    )

    await run()
    const outputs = getOutputs(spooledStdout)

    // console.debug(out)
    expect(outputs[Outputs.ERRORED]).toEqual('false')
    expect(outputs[Outputs.PASSED]).toEqual('false')
    expect(JSON.parse(outputs[Outputs.JSON_OUTPUT])).toMatchObject(
      JSON.parse(expected)
    )
    expect(process.exitCode).not.toEqual(0)
  })

  test('runs the default config', async () => {
    await run()
    const outputs = getOutputs(spooledStdout)

    expect(outputs[Outputs.ERRORED]).toEqual('false')
    expect(outputs[Outputs.PASSED]).toEqual('false')
    expect(process.exitCode).not.toEqual(0)
  })

  test('throws if the config is invalid', async () => {
    const configPath = path.resolve(__dirname, 'invalidtestconfig.json')
    process.env[getInputName(Inputs.CONFIG_FILE)] = configPath

    await run()
    const outputs = getOutputs(spooledStdout)

    // console.debug(out)
    expect(outputs[Outputs.ERRORED]).toEqual('true')
    expect(outputs[Outputs.PASSED]).toEqual('false')
    expect(process.exitCode).not.toEqual(0)
  })

  test('runs a passing config', async () => {
    const configPath = path.resolve(__dirname, 'passingtestconfig.json')
    process.env[getInputName(Inputs.CONFIG_FILE)] = configPath

    await run()
    const outputs = getOutputs(spooledStdout)

    const expected = jsonFormatter.formatOutput(
      await lint(
        '.',
        undefined,
        JSON.parse(await fs.promises.readFile(configPath, 'utf8')),
        true
      ),
      true
    )

    // console.debug(out)
    expect(outputs[Outputs.ERRORED]).toEqual('false')
    expect(outputs[Outputs.PASSED]).toEqual('true')
    expect(JSON.parse(outputs[Outputs.JSON_OUTPUT])).toMatchObject(
      JSON.parse(expected)
    )
    expect(process.exitCode).toEqual(0)
  })

  test('exits 0 when repolinter.passes is false if issue output is enables', async () => {
    const config = {
      owner: 'newrelic',
      repo: 'repolinter-action'
    }
    // mock stolen from createOrUpdateIssue.ts
    const findIssueScope = nock('https://api.github.com')
      .get(`/repos/${config.owner}/${config.repo}/issues`)
      .query(true)
      .reply(200, [{number: 7}])
    const updateIssueScope = nock('https://api.github.com')
      .patch(`/repos/${config.owner}/${config.repo}/issues/7`)
      .reply(200, {number: 7})

    const configPath = path.resolve(__dirname, 'testconfig.json')
    process.env[getInputName(Inputs.CONFIG_FILE)] = configPath
    process.env[getInputName(Inputs.OUTPUT_TYPE)] = 'issue'
    process.env[getInputName(Inputs.TOKEN)] = '123315213523b53'

    const expected = jsonFormatter.formatOutput(
      await lint(
        '.',
        undefined,
        JSON.parse(await fs.promises.readFile(configPath, 'utf8')),
        true
      ),
      true
    )

    await run(true)
    const outputs = getOutputs(spooledStdout)

    expect(outputs[Outputs.ERRORED]).toEqual('false')
    expect(outputs[Outputs.PASSED]).toEqual('false')
    expect(outputs[Outputs.JSON_OUTPUT])
    expect(JSON.parse(outputs[Outputs.JSON_OUTPUT])).toMatchObject(
      JSON.parse(expected)
    )
    expect(process.exitCode).toEqual(0)

    findIssueScope.done()
    updateIssueScope.done()
  })
})
