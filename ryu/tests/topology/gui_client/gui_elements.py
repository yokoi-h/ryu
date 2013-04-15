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

import time
import re
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException


_CONTENTS = {}


def _set_content(content):
    def _set_cls_content(cls):
        cls.name = content
        _CONTENTS[content] = cls
        return cls
    return _set_cls_content


class Elements(object):
    def __init__(self, driver):
        self._driver = driver
        self.fail = AssertionError

    def register_contents(self):
        for content, cls in _CONTENTS.items():
            setattr(self, content, cls(self._driver))

    def get_el(self, by, value):
        try:
            element = self._driver.find_element(by=by, value=value)
        except NoSuchElementException, e:
            return False
        return element

    def get_els(self, by, value):
        try:
            elements = self._driver.find_elements(by=by, value=value)
        except NoSuchElementException, e:
            return False
        return elements

    def wait_for_displayed(self, el, timeout=30):
        for i in range(timeout):
            if el and el.is_displayed():
                return True
            time.sleep(1)
        self.fail("displayed time out")

    def wait_for_text(self, el, text, timeout=30):
        for i in range(timeout):
            if el and re.search(r'%s' % text, el.text):
                return True
            time.sleep(1)
        self.fail("text time out")


@_set_content('menu')
class Menu(Elements):
    def __init__(self, driver):
        super(Menu, self).__init__(driver)

        self.body = lambda: self.get_el(By.ID, "menu")
        self.titlebar = lambda: self.get_el(By.CSS_SELECTOR,
                                            "#menu > div.content-title")
        self.dialog = lambda: self.get_el(By.ID, "jquery-ui-dialog-opener")
        self.link_list = lambda: self.get_el(By.ID, "menu-link-status")
        self.flow_list = lambda: self.get_el(By.ID, "menu-flow-entries")


@_set_content('dialog')
class Dialog(Elements):
    def __init__(self, driver):
        super(Dialog, self).__init__(driver)

        self.body = lambda: self.get_el(By.ID, "jquery-ui-dialog")
        self.host = lambda: self.get_el(By.ID, "jquery-ui-dialog-form-host")
        self.port = lambda: self.get_el(By.ID, "jquery-ui-dialog-form-port")
        self.cancel = lambda: self.get_el(By.XPATH,
                                          "(//button[@type='button'])[2]")
        self.launch = lambda: self.get_el(By.XPATH,
                                          "//button[@type='button']")
        self.close = lambda: self.get_el(By.CSS_SELECTOR,
                                         "span.ui-icon.ui-icon-closethick")


@_set_content('topology')
class Topology(Elements):
    def __init__(self, driver):
        super(Topology, self).__init__(driver)

        self.body = lambda: self.get_el(By.ID, "topology")
        self.titlebar = lambda: self.get_el(By.CSS_SELECTOR,
                                            "#topology > div.content-title")
        self.switches = lambda: self.get_els(By.CSS_SELECTOR,
                                             "#topology > div.switch")
        self.switch = lambda dpid: self.get_el(By.ID,
                                               "node-switch-%d" % int(dpid))


@_set_content('link_list')
class LinkList(Elements):
    def __init__(self, driver):
        super(LinkList, self).__init__(driver)

        self.body = lambda: self.get_el(By.ID, "link-list")
        self.close = lambda: self.get_el(By.XPATH,
                                         "//div[@id='link-list']/div/div[2]")
        self.titlebar = lambda: self.get_el(By.CSS_SELECTOR,
                                            "#link-list > div.content-title")
        self.rows = lambda: self.get_els(
            By.CSS_SELECTOR, "#link-list > td.content-table-item")


@_set_content('flow_list')
class FlowList(Elements):
    def __init__(self, driver):
        super(FlowList, self).__init__(driver)

        self.body = lambda: self.get_el(By.ID, "flow-list")
        self.close = lambda: self.get_el(By.XPATH,
                                         "//div[@id='flow-list']/div/div[2]")
        self.titlebar = lambda: self.get_el(By.CSS_SELECTOR,
                                            "#flow-list > div.content-title")
        self.rows = lambda: self.get_els(
            By.CSS_SELECTOR, "#flow-list > td.content-table-item")
