declare const process: {
  env: {
    API_KEY: string;
    [key: string]: string | undefined;
  }
};

declare module "*.css";
