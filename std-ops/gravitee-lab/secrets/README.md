
## CICD Secrets taxonomy trees

All CI CD Secrets have to be managed with Secrethub.

The Glocal CI CD system, will run into two isolated worlds :
* the "real world" (production) : where the CI CD System works for the Gravitee.io Team. That's the https
* the "test world" (tests) : where the CI CD System is tested
* isolation is reached at the Github Organization level :
  * 2 completely different Github organizations
  * and therefore 2 completely different secrets taxonomy trees to operate.

With this point of view, the _**The Gravitee Secrets Inventory**_ will therefore have to extensively document those two taxonomy trees.

### CICD Secrets taxonomy tree for https://github.com/gravitee-lab (Tests)


* Secrethub orgs:
  * `gravitee-lab`
* Secrethub repos:
  * `gravitee-lab/cicd`

* secrets :
  * `gravitee-lab/cicd/graviteebot/circleci/secrethub-svc-account/token`: Secrethub Service Account (Robot user) for Circle CI Pipelines (Secrethub / Circle CI integration)
  * `gravitee-lab/cicd/graviteebot/circleci/api/token` : Circle CI Token used by the Gravitee CI CD Orchestrator
  * `gravitee-lab/cicd/graviteebot/circleci/api/.secrets.json` : Circle CI secret file used by the Gravitee CI CD Orchestrator
  * [Gravitee bot](https://github.com/gravitee-lab) git config in all Git Service providers (Github, Gitlab, Bitbucket etc...) :
    * `gravitee-lab/cicd/graviteebot/git/user/name` : [Gravitee bot](https://github.com/gravitee-lab) git user name
    * `gravitee-lab/cicd/graviteebot/git/user/email` : [Gravitee bot](https://github.com/gravitee-lab) git user email
    * `gravitee-lab/cicd/graviteebot/git/ssh/private_key` : [Gravitee bot](https://github.com/gravitee-lab) git ssh private key
    * `gravitee-lab/cicd/graviteebot/git/ssh/public_key` :  [Gravitee bot](https://github.com/gravitee-lab) git ssh public key

#### Install Secrethub CLI

* To install Secrethub CLI on Windows, go to https://secrethub.io/docs/reference/cli/install/#windows
* To install Secrethub CLI on any GNU/Linux or Mac OS:

```bash
# eg : https://github.com/secrethub/secrethub-cli/releases/download/v0.41.2/secrethub-v0.41.2-darwin-amd64.tar.gz
export SECRETHUB_CLI_VERSION=0.41.0
# Use [export SECRETHUB_OS=linux] instead of [export SECRETHUB_OS=darwin] for
# most of GNU/Linux Distribution that is not Mac OS.
export SECRETHUB_OS=darwin
export SECRETHUB_CPU_ARCH=amd64


curl -LO https://github.com/secrethub/secrethub-cli/releases/download/v${SECRETHUB_CLI_VERSION}/secrethub-v${SECRETHUB_CLI_VERSION}-${SECRETHUB_OS}-${SECRETHUB_CPU_ARCH}.tar.gz

sudo mkdir -p /usr/local/bin
sudo mkdir -p /usr/local/secrethub/${SECRETHUB_CLI_VERSION}
sudo tar -C /usr/local/secrethub/${SECRETHUB_CLI_VERSION} -xzf secrethub-v${SECRETHUB_CLI_VERSION}-${SECRETHUB_OS}-${SECRETHUB_CPU_ARCH}.tar.gz

sudo ln -s /usr/local/secrethub/${SECRETHUB_CLI_VERSION}/bin/secrethub /usr/local/bin/secrethub

secrethub --version
```

#### Init/Rotate secrets

* Secrethub Service Account (Robot user) for Circle CI Pipelines (Secrethub / Circle CI integration) :

```bash
# made with @JB 's Github User for https://github.com/gravitee-lab Github Org
export SECRETHUB_ORG=gravitee-lab
export SECRETHUB_REPO=cicd

secrethub org init ${SECRETHUB_ORG}
secrethub repo init ${SECRETHUB_ORG}/${SECRETHUB_REPO}
# --- #
# create a service account
secrethub service init "${SECRETHUB_ORG}/${SECRETHUB_REPO}" --description "Circle CI  Service Account for the [cicd-orchestrator] Cirlce CI context for the https://github.com/gravitee-lab Organization" --permission read | tee ./.the-created.service.token
secrethub service ls "${SECRETHUB_ORG}/${SECRETHUB_REPO}"
echo "Beware : you will see the service token only once, then you will not ever be able to see it again, don'tloose it (or create another)"
# --- #
# and give the service accoutn access to all directories and secrets in the given repo, with the option :
# --- #
# finally, in Circle CI, you created a 'cicd-orchestrator' context in the [gravitee-lab] organization
# dedicated to the Gravitee Ci CD Orchestrator application
# and in that 'cicd-orchestrator' Circle CI context, you set the 'SECRETHUB_CREDENTIAL' env. var. with
# value the token of the service account you just created


# saving service account token
secrethub mkdir --parents "${SECRETHUB_ORG}/${SECRETHUB_REPO}/graviteebot/circleci/secrethub-svc-account"
cat ./.the-created.service.token | secrethub write "${SECRETHUB_ORG}/${SECRETHUB_REPO}/graviteebot/circleci/secrethub-svc-account/token"
# test retrieving secret
secrethub read "${SECRETHUB_ORG}/${SECRETHUB_REPO}/graviteebot/circleci/secrethub-svc-account/token"
```

* Circle CI Token and secret file used by the Gravitee CI CD Orchestrator :

```bash
export CCI_SECRET_FILE=$PWD/.secrets.json
export SECRETHUB_ORG=gravitee-lab
export SECRETHUB_REPO=cicd

# created the Circle CI Token with @JB 's Circle CI User
# secrethub mkdir --parents "${SECRETHUB_ORG}/${SECRETHUB_REPO}/graviteebot/circleci/api"
# echo "<value of the Circle CI token you created>" | secrethub write ${SECRETHUB_ORG}/${SECRETHUB_REPO}/graviteebot/circleci/api/token

export CIRCLECI_TOKEN=$(secrethub read ${SECRETHUB_ORG}/${SECRETHUB_REPO}/graviteebot/circleci/api/token)

echo "{" | tee -a ${CCI_SECRET_FILE}
echo "  \"circleci\": {" | tee -a ${CCI_SECRET_FILE}
echo "    \"auth\": {" | tee -a ${CCI_SECRET_FILE}
echo "      \"username\": \"Gravitee.io Lab Bot\"," | tee -a ${CCI_SECRET_FILE}
echo "      \"token\": \"${CIRCLECI_TOKEN}\"" | tee -a ${CCI_SECRET_FILE}
echo "    }" | tee -a ${CCI_SECRET_FILE}
echo "  }" | tee -a ${CCI_SECRET_FILE}
echo "}" | tee -a ${CCI_SECRET_FILE}


secrethub write --in-file ${CCI_SECRET_FILE} "${SECRETHUB_ORG}/${SECRETHUB_REPO}/graviteebot/circleci/api/.secret.json"
# test retrieving secrets
secrethub read --out-file ./test.retrievieving.secret.json "${SECRETHUB_ORG}/${SECRETHUB_REPO}/graviteebot/circleci/api/.secret.json"
secrethub read ${SECRETHUB_ORG}/${SECRETHUB_REPO}/graviteebot/circleci/api/token

```

* SSH Key Pair used by the Gravitee.io Lab Bot to git commit n push to `gravitee-lab` repos :

```bash
# --
# ENV. VARS
export SECRETHUB_ORG=gravitee-lab
export SECRETHUB_REPO=cicd

# secrethub org init ${SECRETHUB_ORG}
# secrethub repo init ${SECRETHUB_ORG}/${SECRETHUB_REPO}

secrethub mkdir --parents "${SECRETHUB_ORG}/${SECRETHUB_REPO}/graviteebot/git/user"
secrethub mkdir --parents "${SECRETHUB_ORG}/${SECRETHUB_REPO}/graviteebot/git/gpg"
secrethub mkdir --parents "${SECRETHUB_ORG}/${SECRETHUB_REPO}/graviteebot/git/ssh"


# --- # --- # --- # --- # --- # --- # --- # --- # --- #
# --- # --- # --- # --- # --- # --- # --- # --- # --- #
# --- # --- # --- # --- # --- # --- # --- # --- # --- #
#            Git user name and email of               #
#                 the Gravitee.io Lab Bot                 #
# --- # --- # --- # --- # --- # --- # --- # --- # --- #
# --- # --- # --- # --- # --- # --- # --- # --- # --- #
# --- # --- # --- # --- # --- # --- # --- # --- # --- #

# --- #
# https://github.com/gravitee-lab-cicd-bot is the Github User of the Gravitee.io Lab Bot
# --- #
export GIT_USER_NAME="Gravitee.io Lab Bot"
export GIT_USER_EMAIL="contact@gravitee-lab.io"

echo "${GIT_USER_NAME}" | secrethub write "${SECRETHUB_ORG}/${SECRETHUB_REPO}/graviteebot/git/user/name"
echo "${GIT_USER_EMAIL}" | secrethub write "${SECRETHUB_ORG}/${SECRETHUB_REPO}/graviteebot/git/user/email"



# --- # --- # --- # --- # --- # --- # --- # --- # --- #
# --- # --- # --- # --- # --- # --- # --- # --- # --- #
# --- # --- # --- # --- # --- # --- # --- # --- # --- #
#        SSH RSA Key Pair of the Gravitee.io Lab Bot      #
#                for Github SSH Service               #
# --- # --- # --- # --- # --- # --- # --- # --- # --- #
# --- # --- # --- # --- # --- # --- # --- # --- # --- #
# --- # --- # --- # --- # --- # --- # --- # --- # --- #


export LOCAL_SSH_PUBKEY=${HOME}/.ssh.cicd.graviteebot/id_rsa.pub
export LOCAL_SSH_PRVIKEY=${HOME}/.ssh.cicd.graviteebot/id_rsa
# --- #
# https://github.com/gravitee-lab-cicd-bot is the Github User of the Gravitee.io Lab Bot
# --- #
export ROBOTS_ID=gravitee-lab

export LE_COMMENTAIRE_DE_CLEF="[$ROBOTS_ID]-cicd-bot@github.com"
# --- #
# Is it extremely important that the Private Key passphrase is empty, for
# the Key Pair to be used as SSH Key with Github.com Git Service
# --- #
export PRIVATE_KEY_PASSPHRASE=''

mkdir -p ${HOME}/.ssh.cicd.graviteebot
ssh-keygen -C "${LE_COMMENTAIRE_DE_CLEF}" -t rsa -b 4096 -f ${LOCAL_SSH_PRVIKEY} -q -P "${PRIVATE_KEY_PASSPHRASE}"

sudo chmod 700 ${HOME}/.ssh.cicd.graviteebot
sudo chmod 644 ${LOCAL_SSH_PUBKEY}
sudo chmod 600 ${LOCAL_SSH_PRVIKEY}

secrethub write --in-file ${LOCAL_SSH_PUBKEY} "${SECRETHUB_ORG}/${SECRETHUB_REPO}/graviteebot/git/ssh/public_key"
secrethub write --in-file ${LOCAL_SSH_PRVIKEY} "${SECRETHUB_ORG}/${SECRETHUB_REPO}/graviteebot/git/ssh/private_key"

secrethub read --out-file ".retrieved.ssh.cicd.graviteebot.id_rsa.pub" "${SECRETHUB_ORG}/${SECRETHUB_REPO}/graviteebot/git/ssh/public_key"
echo ''
cat .retrieved.ssh.cicd.graviteebot.id_rsa.pub
echo ''
read -p "Add the above PUBLIC Rsa Key to the SSH Keys of https://github.com/gravitee-lab, the Github User of the , then hit the enter Key to proceed secrets initalization"


# --- # --- # --- # --- # --- # --- # --- # --- # --- #
# --- # --- # --- # --- # --- # --- # --- # --- # --- #
# --- # --- # --- # --- # --- # --- # --- # --- # --- #
#        GPG Key Pair of the           #
#                for Github SSH Service               #
# --- # --- # --- # --- # --- # --- # --- # --- # --- #
# --- # --- # --- # --- # --- # --- # --- # --- # --- #
# --- # --- # --- # --- # --- # --- # --- # --- # --- #

export GRAVITEEBOT_GPG_USER_NAME=""
export GRAVITEEBOT_GPG_USER_EMAIL="contact@gravitee-lab.io"

read -p "Create a GPG KEY for the Gravitee.io bot with username [${GRAVITEEBOT_GPG_USER_NAME}] and email [${GRAVITEEBOT_GPG_USER_EMAIL}], then hit the enter Key to proceed secrets initalization"

export GPG_SIGNING_KEY=$(gpg --list-signatures -a "${GRAVITEEBOT_GPG_USER_NAME} <${GRAVITEEBOT_GPG_USER_EMAIL}>" | grep 'sig' | tail -n 1 | awk '{print $2}')
echo "GPG_SIGNING_KEY=${GPG_SIGNING_KEY}"

export GPG_PUB_KEY_FILE="./graviteebot.gpg.pub.key"
export GPG_PRIVATE_KEY_FILE="./graviteebot.gpg.priv.key"

# --- #
# saving
gpg --export -a "${GRAVITEEBOT_GPG_USER_NAME} <${GRAVITEEBOT_GPG_USER_EMAIL}>" | tee ${GPG_PUB_KEY_FILE}
# -- #
# Will be interactive for private key : you
# will have to type your GPG password
gpg --export-secret-key -a "${GRAVITEEBOT_GPG_USER_NAME} <${GRAVITEEBOT_GPG_USER_EMAIL}>" | tee ${GPG_PRIVATE_KEY_FILE}

secrethub write --in-file ${GPG_PUB_KEY_FILE} "${SECRETHUB_ORG}/${SECRETHUB_REPO}/graviteebot/git/gpg/pub_key"
secrethub write --in-file ${GPG_PRIVATE_KEY_FILE} "${SECRETHUB_ORG}/${SECRETHUB_REPO}/graviteebot/git/gpg/private_key"

echo "${GRAVITEEBOT_GPG_USER_NAME}" | secrethub write "${SECRETHUB_ORG}/${SECRETHUB_REPO}/graviteebot/git/gpg/user_name"
echo "${GRAVITEEBOT_GPG_USER_EMAIL}" | secrethub write "${SECRETHUB_ORG}/${SECRETHUB_REPO}/graviteebot/git/gpg/user_email"
echo "${GPG_SIGNING_KEY}" | secrethub write "${SECRETHUB_ORG}/${SECRETHUB_REPO}/graviteebot/git/gpg/signing_key"



secrethub account inspect

# --- #
```