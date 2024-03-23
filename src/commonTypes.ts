import { CompanyTypes, ScraperCredentials, ScraperOptions } from 'israeli-bank-scrapers';
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

// TODO rethink optionals
export interface AccountToScrapeConfig {
  options: ScraperOptions;
  loginFields: ScraperCredentials;
  startDate?: Date;
  showBrowser?: boolean;
  active?: boolean;
}

