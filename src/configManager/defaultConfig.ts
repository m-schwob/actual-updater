import { AccountToScrapeConfig, Config } from '../commonTypes';

const DEFAULT_CONFIG: Config = {
  account:{
    startDate : new Date('2020-01-01'),
    showBrowser: false
  },
  scraping: {
    accountsToScrape: [],
    timeout: 60000
  },
  actual:{}
};


export default DEFAULT_CONFIG;
