import puppeteer from 'puppeteer-core';
import { startFlow } from 'lighthouse';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'https://khakhlong.vercel.app';
const TENANT_SLUG = 'test-b';
const USERNAME = 'Aoddy';
const PASSWORD = '123456';

async function testAuthNavigation() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800'],
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();

  console.log('Navigating to login page...');
  await page.goto(`${BASE_URL}/${TENANT_SLUG}/login`, { waitUntil: 'networkidle2' });

  console.log('Typing credentials...');
  await page.waitForSelector('input[name="username"]', { timeout: 10000 });
  await page.type('input[name="username"]', USERNAME);
  await page.type('input[name="password"]', PASSWORD);

  console.log('Submitting login form...');
  const submitBtn = await page.$('button[type="submit"]');
  await submitBtn.click();

  // Wait for navigation / redirect to /tables
  console.log('Waiting for URL change to tables...');
  await page.waitForFunction(
    slug => window.location.pathname.includes(`/${slug}/tables`),
    { timeout: 15000 },
    TENANT_SLUG
  );

  console.log('Login successful! Current URL:', page.url());

  // Check if we can navigate to MainPOS
  console.log('Navigating to MainPOS...');
  await page.goto(`${BASE_URL}/${TENANT_SLUG}/mainpos`, { waitUntil: 'networkidle2' });
  console.log('MainPOS URL:', page.url());
  const mainPosContent = await page.evaluate(() => document.body.innerText.slice(0, 150));
  console.log('MainPOS page content preview:', mainPosContent.replace(/\n/g, ' '));

  await browser.close();
}

testAuthNavigation().catch(err => {
  console.error('Error during test:', err);
  process.exit(1);
});

