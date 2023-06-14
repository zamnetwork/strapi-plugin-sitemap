'use strict';

const axios = require('axios');
const stream = require('stream');
const { promisify } = require('util');
const { createWriteStream } = require('fs');
const { S3Client, PutObjectCommand, ListObjectsV2Command, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { pluginId } = require('../utils');

function buildKey(path) {
  const { providerOptions: { params: { Key } } } = strapi.config.get('plugin.upload');
  return `${Key}/${pluginId}/${path}`;
}

function getUrl(key) {
  const { providerOptions: { params: { Bucket } } } = strapi.config.get('plugin.upload');
  return `https://${Bucket}.s3.amazonaws.com/${key}`;
}

function getLocation(key) {
  const { providerOptions: { params: { Bucket } } } = strapi.config.get('plugin.upload');
  return `https://${Bucket}.s3.amazonaws.com/${key}`;
}

async function download(url, filepath) {
  console.log(`Downloading file from ${url} to ${filepath}`);
  const result = await axios({
    url,
    method: 'get',
    responseType: 'stream',
  });
  const downloadStream = result.data;
  const writeStream = createWriteStream(filepath);
  const pipeline = promisify(stream.pipeline);
  await pipeline(downloadStream, writeStream)
    .catch(e => {
      console.error(`Downloading image failed: ${e}`);
    });
}

async function upload(Body, Key) {
  console.log(`Uploading to S3`);
  const { providerOptions: { params: { Bucket }, credentials, region } } = strapi.config.get('plugin.upload');
  const client = new S3Client({ credentials, region });
  const uploadParams = {
    ACL: 'public-read',
    Bucket,
    Key,
    Body,
  };
  const command = new PutObjectCommand(uploadParams);
  await client.send(command);
  const location = getLocation(Key);
  return location;
}

async function listObjects() {
  const { providerOptions: { params: { Bucket, Key }, credentials, region } } = strapi.config.get('plugin.upload');
  console.log(`Listing Bucket ${Bucket}`);
  const client = new S3Client({ credentials, region });
  const listParams = {
    Bucket,
    Prefix: `${Key}/${pluginId}/`,
    Delimiter: '/',
    StartAfter: `${Key}/${pluginId}/`,
  };
  const command = new ListObjectsV2Command(listParams);
  const resp = await client.send(command);
  return resp;
}

async function exists(key) {
  console.log(`Checking if ${key} exists in S3`);
  const { providerOptions: { params: { Bucket }, credentials, region } } = strapi.config.get('plugin.upload');
  const client = new S3Client({ credentials, region });
  const params = {
    Bucket,
    Key: key,
  };
  const command = new HeadObjectCommand(params);
  await client.send(command)
    .catch((e) => { return false; });
  return true;
}

module.exports = () => ({
  exists,
  upload,
  download,
  buildKey,
  getUrl,
  getLocation,
  listObjects,
});
