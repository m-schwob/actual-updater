# Use the official Node.js image
FROM node:18.19.0

# Install Yarn via the official script
RUN curl -fsSL https://install.yarnpkg.com | bash

# Create and set the working directory
WORKDIR /app

# Copy package.json and yarn.lock first to leverage Docker cache
COPY package.json yarn.lock tsconfig.json ./

# Install dependencies
RUN yarn install

# Copy the rest of the project files
COPY src ./src

# Build the TypeScript code
RUN yarn build

# Set the command to run your app
CMD ["node", "dist/index.js"]
