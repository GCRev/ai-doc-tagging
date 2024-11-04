# LLM Exploration

## Setup

Create a venv

```bash
python3 -m venv venv
```

Install the requirements

```bash
pip install -r requirements.txt
```

```bash
pushd viewer
npm i
popd
```

```bash
cd server
npm i
```

**Make sure you have the correct binaries for pandoc installed locally for your OS. The archive in this repo is for linux and I didn't make any provisions in code to switch the paths based on the detected operating system. It is looking for pandoc 3.5**

## Run the dev server (which is the only thing I tested)

```bash
cd server
npm run dev
```

The dev server runs on 0.0.0.0:4000
