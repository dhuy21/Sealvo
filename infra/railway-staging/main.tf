# Staging only. This creates a new Railway project.
# It does not manage the existing Sealvo project, so production is left alone.
# Images stay on GHCR. GitHub Actions still moves the :staging tag and redeploys.

locals {
  environment_id = railway_project.staging.default_environment.id
  # Railway stores this text and substitutes it. $${{ keeps the ${{ marker for Railway.
  api_database_url    = "mysql://root:$${{MySQL.MYSQL_ROOT_PASSWORD}}@$${{MySQL.RAILWAY_PRIVATE_DOMAIN}}:3306/sealvo?connection_limit=8"
  worker_database_url = "mysql://root:$${{MySQL.MYSQL_ROOT_PASSWORD}}@$${{MySQL.RAILWAY_PRIVATE_DOMAIN}}:3306/sealvo?connection_limit=4"
  scheduler_api_url   = "http://$${{API.RAILWAY_PRIVATE_DOMAIN}}:$${{API.PORT}}"
  tts_enabled = (
    var.google_tts_project_id != "" &&
    var.google_tts_client_email != "" &&
    var.google_tts_private_key != ""
  )
}

resource "random_password" "mysql_root" {
  length  = 32
  special = false
}

resource "random_password" "redis" {
  length  = 32
  special = false
}

resource "random_password" "rabbitmq" {
  length  = 32
  special = false
}

resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "random_password" "cron" {
  length  = 64
  special = false
}

resource "railway_project" "staging" {
  name         = "Sealvo Staging"
  description  = "Staging only. Production stays in the original Sealvo project."
  workspace_id = var.workspace_id
  private      = true

  default_environment = {
    name = "staging"
  }
}

resource "railway_service" "mysql" {
  name         = "MySQL"
  project_id   = railway_project.staging.id
  source_image = "mysql:9"
  start_command = join(" ", [
    "docker-entrypoint.sh mysqld",
    "--innodb-use-native-aio=0",
    "--disable-log-bin",
    "--performance_schema=0",
    "--innodb-buffer-pool-size=256M",
  ])
  restart_policy_type        = "ON_FAILURE"
  restart_policy_max_retries = 10

  regions = [{
    region       = var.region
    num_replicas = 1
  }]

  volume = {
    name       = "mysql"
    mount_path = "/var/lib/mysql"
  }
}

resource "railway_service" "redis" {
  name                       = "Redis"
  project_id                 = railway_project.staging.id
  source_image               = "redis:8.2.9"
  start_command              = "/bin/sh -c 'rm -rf $RAILWAY_VOLUME_MOUNT_PATH/lost+found/ && exec docker-entrypoint.sh redis-server --requirepass $REDIS_PASSWORD --save 60 1 --dir $RAILWAY_VOLUME_MOUNT_PATH'"
  restart_policy_type        = "ON_FAILURE"
  restart_policy_max_retries = 10

  regions = [{
    region       = var.region
    num_replicas = 1
  }]

  volume = {
    name       = "redis"
    mount_path = "/data"
  }
}

resource "railway_service" "rabbitmq" {
  name                       = "RabbitMQ"
  project_id                 = railway_project.staging.id
  source_image               = "rabbitmq:4-management-alpine"
  restart_policy_type        = "ON_FAILURE"
  restart_policy_max_retries = 10

  regions = [{
    region       = var.region
    num_replicas = 1
  }]

  volume = {
    name       = "rabbitmq"
    mount_path = "/var/lib/rabbitmq"
  }
}

resource "railway_service" "api" {
  name                           = "API"
  project_id                     = railway_project.staging.id
  source_image                   = var.api_image
  source_image_registry_username = var.ghcr_username
  source_image_registry_password = var.ghcr_token
  healthcheck_path               = "/health"
  healthcheck_timeout            = 300
  restart_policy_type            = "ON_FAILURE"
  restart_policy_max_retries     = 10

  regions = [{
    region       = var.region
    num_replicas = 1
  }]
}

resource "railway_service" "web" {
  name                           = "Web"
  project_id                     = railway_project.staging.id
  source_image                   = var.web_image
  source_image_registry_username = var.ghcr_username
  source_image_registry_password = var.ghcr_token
  healthcheck_path               = "/health"
  healthcheck_timeout            = 120
  restart_policy_type            = "ON_FAILURE"
  restart_policy_max_retries     = 10

  regions = [{
    region       = var.region
    num_replicas = 1
  }]
}

resource "railway_service" "worker" {
  name                           = "Worker"
  project_id                     = railway_project.staging.id
  source_image                   = var.api_image
  source_image_registry_username = var.ghcr_username
  source_image_registry_password = var.ghcr_token
  start_command                  = "node dist/worker.js"
  restart_policy_type            = "ON_FAILURE"
  restart_policy_max_retries     = 10

  regions = [{
    region       = var.region
    num_replicas = 3
  }]
}

resource "railway_service" "scheduler" {
  name                           = "Scheduler"
  project_id                     = railway_project.staging.id
  source_image                   = var.api_image
  source_image_registry_username = var.ghcr_username
  source_image_registry_password = var.ghcr_token
  start_command                  = "node dist/scheduler.js"
  restart_policy_type            = "ON_FAILURE"
  restart_policy_max_retries     = 10

  regions = [{
    region       = var.region
    num_replicas = 1
  }]
}

resource "railway_service_domain" "api" {
  subdomain      = "sealvo-staging-api"
  environment_id = local.environment_id
  service_id     = railway_service.api.id
  target_port    = 3000
}

resource "railway_service_domain" "web" {
  subdomain      = "sealvo-staging-web"
  environment_id = local.environment_id
  service_id     = railway_service.web.id
  target_port    = 3000
}

resource "railway_variable" "mysql" {
  for_each = {
    MYSQL_ROOT_PASSWORD = random_password.mysql_root.result
    MYSQL_DATABASE      = "sealvo"
  }
  name           = each.key
  value          = each.value
  environment_id = local.environment_id
  service_id     = railway_service.mysql.id
}

resource "railway_variable" "redis" {
  name           = "REDIS_PASSWORD"
  value          = random_password.redis.result
  environment_id = local.environment_id
  service_id     = railway_service.redis.id
}

resource "railway_variable" "rabbitmq" {
  for_each = {
    RABBITMQ_DEFAULT_USER = "sealvo"
    RABBITMQ_DEFAULT_PASS = random_password.rabbitmq.result
  }
  name           = each.key
  value          = each.value
  environment_id = local.environment_id
  service_id     = railway_service.rabbitmq.id
}

resource "railway_variable" "api" {
  for_each = {
    NODE_ENV                            = "staging"
    PORT                                = "3000"
    DATABASE_URL                        = local.api_database_url
    REDIS_HOST                          = "$${{Redis.RAILWAY_PRIVATE_DOMAIN}}"
    REDIS_PORT                          = "6379"
    REDIS_USER                          = "default"
    REDIS_PASSWORD                      = random_password.redis.result
    RABBITMQ_HOST                       = "$${{RabbitMQ.RAILWAY_PRIVATE_DOMAIN}}"
    RABBITMQ_PORT                       = "5672"
    RABBITMQ_USER                       = "sealvo"
    RABBITMQ_PASS                       = random_password.rabbitmq.result
    JWT_ACCESS_SECRET                   = random_password.jwt.result
    CRON_SECRET                         = random_password.cron.result
    FRONTEND_URL                        = "https://${railway_service_domain.web.domain}"
    GOOGLE_CLIENT_ID                    = var.google_client_id
    GOOGLE_CLIENT_SECRET                = var.google_client_secret
    GOOGLE_REDIRECT_URI                 = "https://${railway_service_domain.api.domain}/auth/google/callback"
    FEEDBACK_RECIPIENT_EMAIL            = var.feedback_recipient_email
    STAGING_EMAIL_INTERCEPT             = var.staging_email_intercept
    AWS_REGION                          = var.aws_region
    AWS_ACCESS_KEY_ID                   = var.aws_access_key_id
    AWS_SECRET_ACCESS_KEY               = var.aws_secret_access_key
    AWS_SES_FROM                        = var.aws_ses_from
    GEMINI_API_KEY                      = var.gemini_api_key
    RAILWAY_DEPLOYMENT_DRAINING_SECONDS = "60"
  }
  name           = each.key
  value          = each.value
  environment_id = local.environment_id
  service_id     = railway_service.api.id
}

resource "railway_variable" "api_tts" {
  for_each = local.tts_enabled ? {
    GOOGLE_TTS_PROJECT_ID   = var.google_tts_project_id
    GOOGLE_TTS_CLIENT_EMAIL = var.google_tts_client_email
    GOOGLE_TTS_PRIVATE_KEY  = var.google_tts_private_key
  } : {}
  name           = each.key
  value          = each.value
  environment_id = local.environment_id
  service_id     = railway_service.api.id
}

resource "railway_variable" "web" {
  name           = "API_URL"
  value          = "https://${railway_service_domain.api.domain}"
  environment_id = local.environment_id
  service_id     = railway_service.web.id
}

# Railway injects PORT=8080 when the service does not set one. The image and the
# public domain both use 3000, so an unset PORT makes the proxy hit a closed port.
resource "railway_variable" "web_port" {
  name           = "PORT"
  value          = "3000"
  environment_id = local.environment_id
  service_id     = railway_service.web.id
}

resource "railway_variable" "worker" {
  for_each = {
    NODE_ENV                            = "staging"
    DATABASE_URL                        = local.worker_database_url
    REDIS_HOST                          = "$${{Redis.RAILWAY_PRIVATE_DOMAIN}}"
    REDIS_PORT                          = "6379"
    REDIS_USER                          = "default"
    REDIS_PASSWORD                      = random_password.redis.result
    RABBITMQ_HOST                       = "$${{RabbitMQ.RAILWAY_PRIVATE_DOMAIN}}"
    RABBITMQ_PORT                       = "5672"
    RABBITMQ_USER                       = "sealvo"
    RABBITMQ_PASS                       = random_password.rabbitmq.result
    STAGING_EMAIL_INTERCEPT             = var.staging_email_intercept
    AWS_REGION                          = var.aws_region
    AWS_ACCESS_KEY_ID                   = var.aws_access_key_id
    AWS_SECRET_ACCESS_KEY               = var.aws_secret_access_key
    AWS_SES_FROM                        = var.aws_ses_from
    GEMINI_API_KEY                      = var.gemini_api_key
    RAILWAY_DEPLOYMENT_DRAINING_SECONDS = "30"
  }
  name           = each.key
  value          = each.value
  environment_id = local.environment_id
  service_id     = railway_service.worker.id
}

resource "railway_variable" "scheduler" {
  for_each = {
    NODE_ENV          = "staging"
    CRON_SECRET       = random_password.cron.result
    SCHEDULER_API_URL = local.scheduler_api_url
    REDIS_HOST        = "$${{Redis.RAILWAY_PRIVATE_DOMAIN}}"
    REDIS_PORT        = "6379"
    REDIS_USER        = "default"
    REDIS_PASSWORD    = random_password.redis.result
  }
  name           = each.key
  value          = each.value
  environment_id = local.environment_id
  service_id     = railway_service.scheduler.id
}
