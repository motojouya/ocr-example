
# Example about Mapped Type in Typescript

## do this
```
host-os$ docker build . -t mapped-type-sample
host-os$ docker run -i -t -v /path/to/your/repository:/usr/local/src/typescript mapped-type-sample /bin/bash
guest-os$ yarn install
guest-os$ ./node_modules/.bin/tsc
guest-os$ node building/index.js
```

docker build . -t motojouya/ocr-example
docker run -it -v $CURRENT_DIR:/usr/local/src/ocr -p 1234:1234 motojouya/ocr-example bash
parcel build app.js -d bundle.js
