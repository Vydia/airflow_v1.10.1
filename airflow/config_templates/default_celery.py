# -*- coding: utf-8 -*-
#
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

import ssl

from airflow import configuration
from airflow.exceptions import AirflowConfigException, AirflowException
from airflow.utils.log.logging_mixin import LoggingMixin


def _broker_supports_visibility_timeout(url):
    return url.startswith("redis://") or url.startswith("sqs://")


log = LoggingMixin().log

broker_url = configuration.conf.get('celery', 'BROKER_URL')

broker_transport_options = configuration.conf.getsection(
    'celery_broker_transport_options'
)
if 'visibility_timeout' not in broker_transport_options:
    if _broker_supports_visibility_timeout(broker_url):
        broker_transport_options = {'visibility_timeout': 21600}

DEFAULT_CELERY_CONFIG = {
    'accept_content': ['json', 'pickle'],
    'event_serializer': 'json',
    'worker_prefetch_multiplier': 1,
    'task_acks_late': True,
    'task_default_queue': configuration.conf.get('celery', 'DEFAULT_QUEUE'),
    'task_default_exchange': configuration.conf.get('celery', 'DEFAULT_QUEUE'),
    'broker_url': broker_url,
    'broker_transport_options': broker_transport_options,
    'result_backend': configuration.conf.get('celery', 'RESULT_BACKEND'),
    'worker_concurrency': configuration.conf.getint('celery', 'WORKER_CONCURRENCY'),
}

celery_ssl_active = False
try:
    celery_ssl_active = configuration.conf.getboolean('celery', 'SSL_ACTIVE')
except AirflowConfigException as e:
    log.warning("Celery Executor will run without SSL")

try:
    if celery_ssl_active:
        broker_use_ssl = {'keyfile': configuration.conf.get('celery', 'SSL_KEY'),
                          'certfile': configuration.conf.get('celery', 'SSL_CERT'),
                          'ca_certs': configuration.conf.get('celery', 'SSL_CACERT'),
                          'cert_reqs': ssl.CERT_REQUIRED}
        DEFAULT_CELERY_CONFIG['broker_use_ssl'] = broker_use_ssl
except AirflowConfigException as e:
    raise AirflowException('AirflowConfigException: SSL_ACTIVE is True, '
                           'please ensure SSL_KEY, '
                           'SSL_CERT and SSL_CACERT are set')
except Exception as e:
    raise AirflowException('Exception: There was an unknown Celery SSL Error. '
                           'Please ensure you want to use '
                           'SSL and/or have all necessary certs and key ({}).'.format(e))

result_backend = DEFAULT_CELERY_CONFIG['result_backend']
