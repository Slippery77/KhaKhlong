import puppeteer from 'puppeteer-core';
import { startFlow } from 'lighthouse';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function test() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800'],
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();
  console.log('Testing startFlow...');
  const flow = await startFlow(page, {
    name: 'Test Flow',
  });

  await flow.navigate('https://khakhlong.vercel.app/');
  console.log('Flow navigation done.');

  const result = await flow.createFlowResult();
  console.log('Steps:', result.steps.length);
  const step = result.steps[0];
  const cats = step.lhr.categories;
  console.log('Scores:');
  for (const [k, v] of Object.entries(cats)) {
    console.log(`  ${k}: ${Math.round(v.score * 100)}`);
  }

  await browser.close();
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

