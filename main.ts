// @deno-types="npm:@types/degit"
import degit from 'npm:degit'

const [githubRepo] = Deno.args

if (!githubRepo) {
  console.log('must supply a repo')
  Deno.exit(1)
}

if (!githubRepo.includes('/')) {
  console.log('repo incorrectly formatted')
  Deno.exit(1)
}

devSetup()

await degit(githubRepo).clone('.')

const textDecoder = new TextDecoder('utf-8')
const pjs = await Deno.readFile('./package.json')

const packageJSON = JSON.parse(textDecoder.decode(pjs))

const devDeps = Object.keys(packageJSON.devDependencies)

if (devDeps.length) {
  await runCommand('npm', 'i', '-D', ...devDeps.map((d) => `${d}@latest`))
}

const deps = Object.keys(packageJSON.dependencies)

if (deps.length) {
  await runCommand('npm', 'i', ...deps.map((d) => `${d}@latest`))
}

await runCommand('git', 'init')

await devTearDown()

console.log('successfully regit-ed', githubRepo)
Deno.exit(0)

function devSetup() {
  if (Deno.env.get('REGIT_DEV')) {
    return Deno.chdir('./example')
  }
}

async function devTearDown() {
  if (Deno.env.get('REGIT_DEV')) {
    Deno.chdir('..')
    await Deno.remove('./example', { recursive: true })
    await Deno.mkdir('./example')
  }
}

async function runCommand(cmdName: string, ...args: string[]) {
  const cmd = new Deno.Command(cmdName, { args })

  const { stdout, stderr, ...result } = await cmd.output()

  console.log(new TextDecoder('utf-8').decode(stdout))
  console.log(new TextDecoder('utf-8').decode(stderr))

  if (!result.success) {
    console.error(`${cmdName} ${args.join(' ')} failed:\n`, result.code, result.signal)
    await devTearDown()
    Deno.exit(result.code)
  }
}
