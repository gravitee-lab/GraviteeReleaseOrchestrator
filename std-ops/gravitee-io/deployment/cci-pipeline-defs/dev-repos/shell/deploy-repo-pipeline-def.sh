#!/bin/bash

# ------
# -- ENV
# ------
# Circle Ci Pipeline definition is by default, NOT deployed
# to the "real" Gravitee.io Github Org.!!!
export GITHUB_ORG=${GITHUB_ORG:-'gravitee-io'}
export OPS_HOME=$(pwd)
export REPOS_URL_LIST_FILE=$1

mkdir -p ${OPS_HOME}/gitops

if [ "x${REPOS_URL_LIST_FILE}" == "x" ]; then
  echo "You did not provide a first argument to [$0] as the <REPOS_URL_LIST_FILE>"
  Usage
  exit 2
fi;

# ------
# -- FUNCTIONS
# ------

Usage () {
  echo "---"
  echo " The [$0] script will commit and push the [.circleci/config.yml] on every [*.*.x] git branch of every git repo    "
  echo "---"
  echo "Usage :"
  echo "---"
  echo "  $0 <REPOS_URL_LIST_FILE>"
  echo "---"
  echo "Where :"
  echo "---"
  echo "  <REPOS_URL_LIST_FILE> is the path fo a text file containing the list of the git repos to which the Circle Ci Pipeline definition must be deployed."
  echo "                        each line of that file, must be the HTTP URL of a git repo"
  echo "---"
  echo "env. variables :"
  echo "---"
  echo "  GIT_SSH_COMMAND (Optional) The git ssh command to use, defaults to 'ssh -i ~/.ssh/id_rsa'"
  echo "  GIT_USER_NAME (mandatory) The git user name to use, to configure git [git config --global user.name]"
  echo "  GIT_USER_EMAIL (mandatory) The git user eamil to use, to configure git [git config --global user.email]"
  echo "  GIT_USER_SIGNING_KEY (Optional) The GPG public Key to use, to sign commits. Has no default value, and if not set, then git is configured with [git config --global commit.gpgsign false]"
  echo "---"
}

setupSSHGithubUser () {
  echo "[$0 - setupSSHGithubUser] QUICK DEBUG "
  echo "[$0 - setupSSHGithubUser] [GIT_USER_NAME=[${GIT_USER_NAME}]] "
  echo "[$0 - setupSSHGithubUser] [GIT_USER_EMAIL=[${GIT_USER_EMAIL}]] "
  echo "[$0 - setupSSHGithubUser] [GIT_SSH_COMMAND=[${GIT_SSH_COMMAND}]] "

  # export GIT_USER_NAME=${GIT_USER_NAME:-'Jean-Baptiste-Lasselle'}
  if [ "x${GIT_USER_NAME}" == "x" ]; then
    echo "[$0 - setupSSHGithubUser] You did not set the [GIT_USER_NAME] env. var."
    Usage
    exit 1
  fi;
  # export GIT_USER_EMAIL=${GIT_USER_EMAIL:-'jean.baptiste.lasselle.pegasus@gmail.com'}
  if [ "x${GIT_USER_EMAIL}" == "x" ]; then
    echo "[$0 - setupSSHGithubUser] You did not set the [GIT_USER_EMAIL] env. var."
    Usage
    exit 1
  fi;
  if [ "x${GIT_USER_SIGNING_KEY}" == "x" ]; then
    echo "[$0 - setupSSHGithubUser] You did not set the [GIT_USER_SIGNING_KEY] env. var."
    git config --global commit.gpgsign false
  else
    git config --global commit.gpgsign true
    git config --global user.signingkey ${GIT_USER_SIGNING_KEY}
  fi;

  # export GIT_SSH_COMMAND=${GIT_SSH_COMMAND:-'ssh -i ~/.ssh.perso.backed/id_rsa'}
  export GIT_SSH_COMMAND=${GIT_SSH_COMMAND:-'ssh -i ~/.ssh/id_rsa'}
  export SSH_PRIVATE_KEY=$(echo "$GIT_SSH_COMMAND" | awk '{print $3}' | sed "s#~#${HOME}#g")

  # git config --global user.name "Jean-Baptiste-Lasselle"
  git config --global user.name "${GIT_USER_NAME}"
  # git config --global user.email jean.baptiste.lasselle.pegasus@gmail.com
  git config --global user.email "${GIT_USER_EMAIL}"

  git config --global --list

  # will re-define the default identity in use
  # https://docstore.mik.ua/orelly/networking_2ndEd/ssh/ch06_04.htm
  ssh-add ${SSH_PRIVATE_KEY}

  # --- #
  # ssh-add -D
  # --- #
  # case of gitlab.com
  # export TEST_STR=$(ssh -Ti ${SSH_PRIVATE_KEY} git@gitlab.com 2>&1|tee)
  # case of github.com
  export TEST_STR=$(ssh -Ti ${SSH_PRIVATE_KEY} git@github.com 2>&1|tee)

  echo "[$0 - setupSSHGithubUser] Before final test TEST_STR=[${TEST_STR}]"
  # case of gitlab.com
  export SUCCESS_STR="Welcome to GitLab"
  # case of github.com
  export SUCCESS_STR="You've successfully authenticated"
  # echo "${TEST_STR}" | grep "${SUCCESS_STR}"
  export GIT_SSH_CONF_TEST_STR=$(echo "${TEST_STR}" | grep "${SUCCESS_STR}")
  echo "[$0 - setupSSHGithubUser] final test GIT_SSH_CONF_TEST_STR=[${GIT_SSH_CONF_TEST_STR}]"

  if [ "x${GIT_SSH_CONF_TEST_STR}" == "x" ]; then
    echo "---"
    echo "[$0 - setupSSHGithubUser] You must change the content of the [setupSSHGithubUser] function in [$0], to properly configure your local git for your github user"
    echo "---"
    Usage
    exit 3
  else
    echo "---"
    echo "[$0 - setupSSHGithubUser] your github user local git config is operational, starting operations"
    echo "---"
  fi;
}

setupCircleCIConfig () {
  export THIS_REPO_URL=$1
  export THIS_REPO_NAME=$(echo ${THIS_REPO_URL} | awk -F '/' '{print $NF}' | awk -F '.git' '{print $1}')
  cd ${OPS_HOME}/gitops/
  echo "[setupCircleCIConfig => ] processing THIS_REPO_URL=[${THIS_REPO_URL}]"
  echo "[setupCircleCIConfig => ] processing THIS_REPO_NAME=[${THIS_REPO_NAME}]"
  git clone ${THIS_REPO_URL}
  if [ "$?" == "0" ]; then
    # then the git clone succeeded (the git repo does exists)
    cd ${OPS_HOME}/gitops/${THIS_REPO_NAME}
    git branch -a | grep -E '*.*.x$' | awk -F '/' '{print $NF}' > ${OPS_HOME}/gitops/${THIS_REPO_NAME}.branches.list
    echo "master" >> ${OPS_HOME}/gitops/${THIS_REPO_NAME}.branches.list
    while read THIS_GIT_BRANCH; do
      git checkout ${THIS_GIT_BRANCH}
      mkdir -p ${OPS_HOME}/gitops/${THIS_REPO_NAME}/.circleci/
      cp -f ${OPS_HOME}/.circleci/config.yml ${OPS_HOME}/gitops/${THIS_REPO_NAME}/.circleci/
      export GIT_COMMIT_MESSAGE=${GIT_COMMIT_MESSAGE:-"[$0] automatic CICD test setup : adding circleci git config"}
      git add --all && git commit -m "${GIT_COMMIT_MESSAGE}" && git push -u origin HEAD
    done <${OPS_HOME}/gitops/${THIS_REPO_NAME}.branches.list
  else
    echo "[setupCircleCIConfig => ] the [${THIS_REPO_URL}] git repo doesnot exist, skipping any git operation"
  fi;

  cd ${OPS_HOME}/gitops/
}



export BARE_FILENAME=$(echo "${REPOS_URL_LIST_FILE}" | awk -F '/' '{print $NF}')
cp ${REPOS_URL_LIST_FILE} ${OPS_HOME}/${BARE_FILENAME}.ssh
# ---
# WORKING TESTS ON GRAVITEE-LAB , NOT GRAVITEE-IO !!! BEWARE !!! => never the less,there is a local backup made locally, just in case
ls -allh ${OPS_HOME}/${BARE_FILENAME}.ssh
sed -i "s#https://github.com/gravitee-io#git@github.com:${GITHUB_ORG}#g" ${OPS_HOME}/${BARE_FILENAME}.ssh
sed -i "s#https://github.com/gravitee-io#git@github.com:${GITHUB_ORG}#g" ${OPS_HOME}/${BARE_FILENAME}.ssh
echo "---"
echo "-- Circle CI Pipeline defintion will be deployed to the following git repos : "
# echo "SECURITY CHECK NO GRAVITEE-IO in \${OPS_HOME}/\${BARE_FILENAME}.ssh=[${OPS_HOME}/${BARE_FILENAME}.ssh] : "
echo "---"
cat ${OPS_HOME}/${BARE_FILENAME}.ssh
echo "---"
echo " IN CASE ANY PROBLEM, A BACK-UP WAS PREPARED ON THIS MACHINE [$(hostname)] in the [${OPS_HOME}/gitops.backup/] Folder "
echo "---"

# echo "JBL DEBUG"
# exit 0

# echo "---"
# echo "  REPOS_URL_LIST_FILE=[${REPOS_URL_LIST_FILE}]"
# echo "---"
# echo "  \${OPS_HOME}/\${BARE_FILENAME}.ssh=[${OPS_HOME}/${BARE_FILENAME}.ssh]"
# echo "---"
# echo " Now turned [git HTTP URLs] into [git SSH URLs] within file [${REPOS_URL_LIST_FILE}]"
# echo "---"



# ------
# -- OPS
# ------


# - first, setup Github User Git SSH config

setupSSHGithubUser

rm -fr ${OPS_HOME}/gitops/
mkdir -p ${OPS_HOME}/gitops/
# --- #
# --- # --- # --- # --- #
# - Then deploy Circle CI Pipeline defintion to each git repo
# --- # --- # --- # --- #
# --- #

# --- # CANCEL PIPELINES FUNCTION
# The deploymentofthe CircleCI Pipeline defintion might trigger pipelines.
# This function allows cancelling all triggered pipeline executions asap, to spare CircleCI service

# ---> Cancel all pipelines for a given repo
cancelPipelines () {
  export THIS_REPO_NAME=$1
  if [ "x${THIS_REPO_NAME}" == "x" ]; then
    echo "[cancelPipelines ()] - you must provide an argument, the name of the git repo in the [${GITHUB_ORG}] Github Org, for which Pipeline executionshave tobe cancelled."
    exit 7
  fi;
  if ! [ -f ${OPS_HOME}/gitops/${THIS_REPO_NAME}.branches.list ]; then
    echo "[cancelPipelines ()] - the [${OPS_HOME}/gitops/${THIS_REPO_NAME}.branches.list] containing the list of all git branches of the [${GITHUB_ORG}/[${THIS_REPO_NAME}]] github repo,forwhich Pipelie execution havetobe cancelled, doesnot exists."
    exit 8
  fi;
  # First, we collect all pipeline GUIDs in [${OPS_HOME}/gitops/${THIS_REPO_NAME}.pipelines-guid.list]
  while read THIS_GIT_BRANCH; do
    echo "--- Collect GUIDs of the 3 last Pipeline executions for repo [${GITHUB_ORG}/${THIS_REPO_NAME}] on BRANCH [${THIS_GIT_BRANCH}] "
    curl -X GET "https://circleci.com/api/v2/project/gh/${GITHUB_ORG}/${THIS_REPO_NAME}/pipeline?branch=${THIS_GIT_BRANCH}" -H 'Content-Type: application/json' -H 'Accept: application/json' -H "Circle-Token: ${CCI_TOKEN}" | jq .
    curl -X GET "https://circleci.com/api/v2/project/gh/${GITHUB_ORG}/${THIS_REPO_NAME}/pipeline?branch=${THIS_GIT_BRANCH}" -H 'Content-Type: application/json' -H 'Accept: application/json' -H "Circle-Token: ${CCI_TOKEN}" | jq .items | jq .[] | jq .id | awk -F '"' '{print $2}' | head -n 3 | tee -a ${OPS_HOME}/gitops/${THIS_REPO_NAME}.pipelines-guid.list
  done <${OPS_HOME}/gitops/${THIS_REPO_NAME}.branches.list

  # --- then, using pipeline GUIDs, we collect GUIDs of all workflows we need to cancel in ${OPS_HOME}/gitops/${THIS_REPO_NAME}.workflows-guid.list
  #
  while read PIPELINE_GUID; do
    echo "--- Collect GUIDs of the 7 first workflows of Pipeline execution of GUID [${PIPELINE_GUID}] for repo [${GITHUB_ORG}/${THIS_REPO_NAME}]]. None of the [${GITHUB_ORG}] Github Org's Circle CI Pipelines, by convention, is allowed to have more than 7 workflows."
    curl -X GET "https://circleci.com/api/v2/pipeline/${PIPELINE_GUID}/workflow" -H 'Content-Type: application/json' -H 'Accept: application/json' -H "Circle-Token: ${CCI_TOKEN}" | jq .items[] | jq .id | awk -F '"' '{print $2}' | head -n 7 | tee -a ${OPS_HOME}/gitops/${THIS_REPO_NAME}.workflows-guid.list
  done <${OPS_HOME}/gitops/${THIS_REPO_NAME}.pipelines-guid.list
  # cat ${OPS_HOME}/gitops/${THIS_REPO_NAME}.pipelines-guid.list
  cat ${OPS_HOME}/gitops/${THIS_REPO_NAME}.workflows-guid.list

  while read WORKFLOW_GUID; do
    echo "--- Cancelling the workflows of GUID [${WORKFLOW_GUID}] for repo [${GITHUB_ORG}/${THIS_REPO_NAME}]]."
    curl -X POST "https://circleci.com/api/v2/workflow/${WORKFLOW_GUID}/cancel" -H 'Content-Type: application/json' -H 'Accept: application/json' -H "Circle-Token: ${CCI_TOKEN}" | jq .
  done <${OPS_HOME}/gitops/${THIS_REPO_NAME}.workflows-guid.list

  rm -f ${OPS_HOME}/gitops/${THIS_REPO_NAME}.pipelines-guid.list
  rm -f ${OPS_HOME}/gitops/${THIS_REPO_NAME}.workflows-guid.list

  # --- then, using pipeline GUIDs, we cancel all workflows for each pipeline ID in ${OPS_HOME}/gitops/${THIS_REPO_NAME}.pipelines-guid.list
  #
}

while read REPO_URL; do
  echo "---"
  setupCircleCIConfig ${REPO_URL}
  # here now we cancel all repo pipelines executions triggered on all its git branches
  # echo "debugging  REPO_URL=[${REPO_URL}]"
  export REPO_NAME=$(echo "${REPO_URL}" | awk -F '/' '{print $2}' | awk -F '.git' '{print $1}')
  echo "invoking [cancelPipelines ${REPO_NAME}]"
  sleep 3s
  cancelPipelines "${REPO_NAME}"
done <${OPS_HOME}/${BARE_FILENAME}.ssh

# --
# Cancelling again for the few Pipeline executions which have escaped
while read REPO_URL; do
  echo "# ---"
  # here now you cancel all repo pipelines on all its git branches
  echo "Cancelling again for the few Pipeline executions which have escaped  REPO_URL=[${REPO_URL}]"
  export REPO_NAME=$(echo "${REPO_URL}" | awk -F '/' '{print $2}' | awk -F '.git' '{print $1}')
  cancelPipelines "${REPO_NAME}"
done <${OPS_HOME}/${BARE_FILENAME}.ssh

# --- # --- # --- # --- # --- # --- # --- # --- # --- #
# --- # --- # --- # --- # --- # --- # --- # --- # --- #
# --- # --- # --- # --- # --- # --- # --- # --- # --- #
#      Deploy Keys for Github SSH Service     #
# --- # --- # --- # --- # --- # --- # --- # --- # --- #
# --- # --- # --- # --- # --- # --- # --- # --- # --- #
# --- # --- # --- # --- # --- # --- # --- # --- # --- #


export JSON_PAYLOAD="{
    \"type\": \"deploy-key\"
}"


while read REPO_URL; do
  # echo "${REPO_URL}" | awk -F '/' '{print $4}'
  export REPO_NAME=$(echo "${REPO_URL}" | awk -F '/' '{print $5}')
  echo "# ------------------------------------------------------------ #"
  echo "creating checkout key for [${GITHUB_ORG}/${REPO_NAME}]"
  echo "# ------------------------------------------------------------ #"
  # --- First let's delete all previous deploy keys
  curl -d "${JSON_PAYLOAD}" -X GET https://circleci.com/api/v2/project/gh/${GITHUB_ORG}/${REPO_NAME}/checkout-key -H 'Content-Type: application/json' -H 'Accept: application/json' -H "Circle-Token: ${CCI_TOKEN}" | jq '.[]' | jq '.[].fingerprint' | awk -F '"' '{print $2}' | tee -a ./${GITHUB_ORG}.${REPO_NAME}.fingerprints.list

  while read FINGERPRINT; do
    curl -d "${JSON_PAYLOAD}" -X DELETE https://circleci.com/api/v2/project/gh/${GITHUB_ORG}/${REPO_NAME}/checkout-key/${FINGERPRINT} -H 'Content-Type: application/json' -H 'Accept: application/json' -H "Circle-Token: ${CCI_TOKEN}" | jq .
  done <./${GITHUB_ORG}.${REPO_NAME}.fingerprints.list
  # -- Finally we re-create a  new deploy key
  curl -d "${JSON_PAYLOAD}" -X POST https://circleci.com/api/v2/project/gh/${GITHUB_ORG}/${REPO_NAME}/checkout-key -H 'Content-Type: application/json' -H 'Accept: application/json' -H "Circle-Token: ${CCI_TOKEN}" | jq .
  echo "# ------------------------------------------------------------ #"
  # cat consolidated-git-repos-uris.list | awk -F '/' '{print $4}'
done <${OPS_HOME}/${REPOS_URL_LIST_FILE}
