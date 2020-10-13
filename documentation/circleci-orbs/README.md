# Circle CI Orbs for the Gravitee.io Team


## A First simple Orb

First, I will try and make a simple `Orb`, including the `.circleci/config.yml` defined for
all Gravitee "dev repos", cf. :
* `src/modules/circleci/status/tests/.circleci/config.yml` (actually deployed by scripts)
* `documentation/cci-pipelines-commons/.circleci/config.yml` : should always be the same as `src/modules/circleci/status/tests/.circleci/config.yml`

To do that, I will follow steps in https://circleci.com/docs/2.0/orb-author-intro/

#### Step 1 : Installing the Circle CI CLI

Installation for both `GNU/Linux` distributions, and `Mac OS` `Darwin` :

```bash
# curl -fLSs https://raw.githubusercontent.com/CircleCI-Public/circleci-cli/master/install.sh | bash

# ---
# CCI_CLI_FOLDER : the path to the folder to which you want to install Circle CI CLI
# You (the Linux user executing the downloaded bash script) need(s) to
# have write permissions to that folder.
# ---
# The version to install and the binary location can be passed in via VERSION and DESTDIR respectively.
#
export CCI_CLI_FOLDER=/opt/local/bin/circleci
export MYUSER=$(whoami)
echo "MYUSER=[${MYUSER}]"
sudo mkdir -p ${CCI_CLI_FOLDER}
sudo chown -R ${MYUSER}:${MYUSER} ${CCI_CLI_FOLDER}

curl -fLSs https://raw.githubusercontent.com/CircleCI-Public/circleci-cli/master/install.sh | DESTDIR=${CCI_CLI_FOLDER} bash

# If you get an error, just read the output, fixing installation won't be hard :
# The [circleci] executable file will be found installed into an mktemp created dir, : a Folder of path '/tmp/tmp.<RANDOM STRING>'
# To fix installation, all you will have to do is to run :
# mv /tmp/tmp.<RANDOM STRING>/* ${CCI_CLI_FOLDER}
#
export PATH="${PATH}:${CCI_CLI_FOLDER}"
circleci version
circleci --help
```

For the record, when I wrote this `README.md`, and installed Circle CI CLI, I downloaded the installation script to `documentation/circleci-orbs/circleci-installation.sh` in this repo.

* Now, we need a Circle CI Personal Access Token, to use the Circle CI CLI. Go to Web UI on https://app.circleci.com to create that, the the User Settings menu
* then :

```bash
export CCI_TOKEN=<very long value of yur personal access token>
# circleci setup : is interactive
circleci setup --token "${CCI_TOKEN}" --host https://circleci.com --no-prompt
```

* after that, your configuration including your secret, is saved to `~/.circleci/cli.yml`
* the formof that Yaml file is :

```Yaml
host: https://circleci.com
endpoint: graphql-unstable
token: <very long value of yur personal access token>
rest_endpoint: api/v2
orb_publishing:
    default_namespace: ""
    default_vcs_provider: ""
    default_owner: ""
```

* Ok, so we will publish our Orbs using this `Circle CI` CLI, and its configuration determines to which server the Orb will be published.
* The Circle CI CLI can be used to validate Yaml syntax of :
  * the `~/.circleci/cli.yml` above mentioned config file
  * and the `Yaml` of an orb

```bash
# validate the Yaml Syntax of `~/.circleci/cli.yml`
circleci config validate
# validate the Yaml Syntax of an orb
circleci orb validate /tmp/my_orb.yml

```

* Given the fact that there are many configurations and commands to run, to manage the development cyle of a Cicle CI `Orb`, I factorized all those commands in a tiny `nodejs` / `typescript` utility, which :
  * I named `orbinoid` and you will find in the `documentation/circleci-orbs/orbinoid` folder
  * I duplicated in the `documentation/circleci-orbs/examples/1` to develop a first `Orb` example.
  * I will duplicate in the `documentation/circleci-orbs/examples/${EXAMPLE_NUMBER}` folders to develop other `Orb` examples.






## Ref. Documentation

* https://circleci.com/docs/2.0/orb-intro/
* https://circleci.com/docs/2.0/orb-author-intro/
* https://circleci.com/docs/2.0/creating-orbs/