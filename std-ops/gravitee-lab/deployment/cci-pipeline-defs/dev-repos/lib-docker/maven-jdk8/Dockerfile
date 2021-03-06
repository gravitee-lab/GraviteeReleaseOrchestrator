ARG MAVEN_VERSION=3.6.3
ARG OPENJDK_VERSION=11
FROM maven:$MAVEN_VERSION-openjdk-$OPENJDK_VERSION

RUN apt-get update -y && apt-get install -y gnupg build-essential
ARG MAVEN_VERSION=3.6.3
ARG OPENJDK_VERSION=11
ARG GITHUB_ORG=unspecified
ARG OCI_VENDOR=$GITHUB_ORG
# LABEL oci.image.tag=maven:"${MAVEN_VERSION}"-openjdk-"${OPENJDK_VERSION}"
LABEL oci.image.tag="${MAVEN_VERSION}-openjdk-${OPENJDK_VERSION}"
LABEL cicd.github.org="${GITHUB_ORG}"
LABEL vendor="${OCI_VENDOR}"
LABEL maintainer="jean-baptiste.lasselle@graviteesource.com"


# --- NON ROOT USER
ARG NON_ROOT_USER_UID=1000
ENV NON_ROOT_USER_UID=$NON_ROOT_USER_UID
ARG NON_ROOT_USER_GID=1000
ENV NON_ROOT_USER_GID=$NON_ROOT_USER_GID

ARG NON_ROOT_USER_NAME=circleci
ENV NON_ROOT_USER_NAME=$NON_ROOT_USER_NAME
ARG NON_ROOT_USER_GRP=circleci
ENV NON_ROOT_USER_GRP=$NON_ROOT_USER_GRP

LABEL oci.image.nonroot.user.name=$NON_ROOT_USER_NAME
LABEL oci.image.nonroot.user.group=$NON_ROOT_USER_GRP
LABEL oci.image.nonroot.user.uid=$NON_ROOT_USER_UID
LABEL oci.image.nonroot.user.gid=$NON_ROOT_USER_GID


RUN groupadd -g $NON_ROOT_USER_GID $NON_ROOT_USER_GRP
RUN useradd -g $NON_ROOT_USER_GRP -u $NON_ROOT_USER_UID -m $NON_ROOT_USER_NAME

RUN ls -allh /home/$NON_ROOT_USER_NAME
# --
# workaround old known issue of docker for non-root users https://github.com/moby/moby/issues/2259#issuecomment-26564115
RUN mkdir -p /home/$NON_ROOT_USER_NAME/.m2
RUN chown $NON_ROOT_USER_NAME:$NON_ROOT_USER_GRP /home/$NON_ROOT_USER_NAME/.m2

RUN echo "whoami = [$(whoami)]"
USER $NON_ROOT_USER_NAME
RUN echo "whoami = [$(whoami)]"

# --- #
# /home/$NON_ROOT_USER_NAME/.secrets will be mapped as a
# volume for secrets from outside(no secretsin a container image)
#
RUN mkdir -p /home/$NON_ROOT_USER_NAME/.secrets
RUN chown $NON_ROOT_USER_NAME:$NON_ROOT_USER_GRP /home/$NON_ROOT_USER_NAME/.secrets

WORKDIR /home

COPY test /home

# CMD ["/home/test"]
