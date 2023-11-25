import { CompanyTypes, ScraperCredentials } from 'israeli-bank-scrapers';
export type { ScaperScrapingResult } from 'israeli-bank-scrapers';

export interface Config {
  account:{
    startDate : Date;
    showBrowser: boolean;
  },
  scraping: {
    accountsToScrape: AccountToScrapeConfig[];
    chromiumPath?: string;
    maxConcurrency?: number;
    timeout: number;
  },
  actual:{}
}

export interface AccountToScrapeConfig {
  companyID: CompanyTypes;
  startDate: Date;
  loginFields: ScraperCredentials;
  showBrowser: boolean;
  active?: boolean;
}

