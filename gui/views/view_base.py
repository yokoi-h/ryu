# Copyright (C) 2013 Nippon Telegraph and Telephone Corporation.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
# implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import logging
from flask import abort, make_response


LOG = logging.getLogger('ryu_gui')


class ViewBase(object):
    def __init__(self, *args, **kwargs):
        pass

    def run(self):
        LOG.error('run() is not defined.')
        abort(500)

    def null_response(self):
        res = make_response()
        res.headers['Content-type'] = 'text/plain'
        return res
