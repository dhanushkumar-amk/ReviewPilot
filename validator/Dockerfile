FROM public.ecr.aws/lambda/nodejs:22

# Install tar and gzip (try dnf first, fall back to microdnf)
RUN (dnf install -y tar gzip 2>/dev/null || microdnf install -y tar gzip) && \
    rm -rf /var/cache/dnf /var/cache/microdnf

# Lambda sees HOME as /var/task by default; override to /tmp so npm cache works
ENV HOME=/tmp
ENV npm_config_cache=/tmp/.npm
ENV npm_config_update_notifier=false
ENV npm_config_fund=false
ENV npm_config_audit=false

COPY src/ ${LAMBDA_TASK_ROOT}/

CMD ["index.handler"]
