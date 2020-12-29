# Optimizing Google fonts

## Usage

Run the worker on your zone.

Transforms

```html
<link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet" />
```

into

```html
<style id="" media="all">
    @font-face {
        font-family: 'Roboto';
        font-style: normal;
        font-weight: 400;
        src: url(/fonts.gstatic.com/s/roboto/v20/KFOmCnqEu92Fr1Mu4mxO.eot);
    }
</style>
```

based on the user-agent.

## Wrangler

You can use [wrangler](https://github.com/cloudflare/wrangler) to generate a new Cloudflare Workers project based on this template by running the following command from your terminal:

```
wrangler generate myapp https://github.com/xtuc/worker-template-fast-google-fonts
```

Before publishing your code you need to edit `wrangler.toml` file and add your Cloudflare `account_id` - more information about publishing your code can be found [in the documentation](https://workers.cloudflare.com/docs/quickstart/configuring-and-publishing/).

Once you are ready, you can publish your code by running the following command:

```
wrangler publish
```

## Serverless

To deploy using serverless add a [`serverless.yml`](https://serverless.com/framework/docs/providers/cloudflare/) file.
