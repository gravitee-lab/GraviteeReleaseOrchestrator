FROM python:3

# ARG S3CMD_VERSION=$S3CMD_VERSION
ARG ORCHESTRATOR_GIT_COMMIT_ID=$ORCHESTRATOR_GIT_COMMIT_ID
ARG GITHUB_ORG=$GITHUB_ORG
ARG OCI_VENDOR=$GITHUB_ORG
# LABEL oci.image.tag=maven:"${MAVEN_VERSION}"-openjdk-"${OPENJDK_VERSION}"
# LABEL cicd.s3cmd.version="${S3CMD_VERSION}"
LABEL cicd.orchestrator.git.commit.id="${ORCHESTRATOR_GIT_COMMIT_ID}"
# LABEL oci.image.tag="python-${S3CMD_VERSION}-cicd-${ORCHESTRATOR_GIT_COMMIT_ID}"
LABEL oci.image.tag="python3-cicd-${ORCHESTRATOR_GIT_COMMIT_ID}"
LABEL cicd.github.org="${GITHUB_ORG}"
LABEL vendor="${OCI_VENDOR}"
LABEL maintainer="jean-baptiste.lasselle@graviteesource.com"

WORKDIR /usr/src/app

# COPY requirements.txt ./
# RUN pip install --no-cache-dir -r requirements.txt
RUN pip install os re shutil zipfile requests json shutil import copy2 urllib urlretrieve
COPY package_bundles.py .

CMD [ "python", "./package_bundles.py" ]