# actual-updater

### Notes
#### nvm
- .nvmrc file contain the node version that should be use. it should be used automatically when running `yarn start` even it not set as the system *use* version and be install when running  `nvm use` (so Codium claimed). [However, it seems that it not supported on Windows](https://stackoverflow.com/questions/69027224/the-nvmrc-file-is-not-read).yar

#### ts-node-esm
- [From node v18.19.0 `ts-node-esm` break](https://github.com/TypeStrong/ts-node/issues/2110). so switched to use `ts-node` instead.
- Trying to config the package.json and tsconfig.json to use ESM modules does not work so we stick with `"module": "CommonJS"` as  israeli-bank-scraper does. 

#### docker image
- The image is currently public for reading at [ghcr.io/m-schwob/actual-updater:latest]()
- To upload a new image, there is need to setup the docker with a token (my mc should be configured).
- To upload new image:  
    - build the image by running `docker build -t actual-updater .`
    - upload the image by running 
    ```
    docker tag actual-updater:latest ghcr.io/m-schwob/actual-updater:latest
    docker push ghcr.io/m-schwob/actual-updater:latest
    ```