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


class DriverUtil(object):
    def __init__(self):
        self.fail = AssertionError

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


class ElementBase(object):
    def __init__(self, driver):
        self._driver = driver
        self.fail = AssertionError

    def _get_el(self, by, value):
        try:
            element = self._driver.find_element(by=by, value=value)
        except NoSuchElementException, e:
            return False
        return element

    def _get_els(self, by, value):
        try:
            elements = self._driver.find_elements(by=by, value=value)
        except NoSuchElementException, e:
            return False
        return elements


class Menu(ElementBase):
    @property
    def body(self):
        return self._get_el(By.ID, "menu")

    @property
    def titlebar(self):
        return self._get_el(By.CSS_SELECTOR,
                            "#menu > div.content-title")

    @property
    def dialog(self):
        return self._get_el(By.ID, "jquery-ui-dialog-opener")

    @property
    def link_list(self):
        return self._get_el(By.ID, "menu-link-status")

    @property
    def flow_list(self):
        return self._get_el(By.ID, "menu-flow-entries")

    @property
    def resize(self):
        return self._get_el(By.XPATH, "//div[@id='menu']/div[6]")


class Dialog(ElementBase):
    @property
    def body(self):
        return self._get_el(By.ID, "jquery-ui-dialog")

    @property
    def host(self):
        return self._get_el(By.ID, "jquery-ui-dialog-form-host")

    @property
    def port(self):
        return self._get_el(By.ID, "jquery-ui-dialog-form-port")

    @property
    def cancel(self):
        return self._get_el(By.XPATH, "(//button[@type='button'])[2]")

    @property
    def launch(self):
        return self._get_el(By.XPATH, "//button[@type='button']")

    @property
    def close(self):
        return self._get_el(By.CSS_SELECTOR, "span.ui-icon.ui-icon-closethick")

    @property
    def resize(self):
        return self._get_el(By.XPATH, "//div[7]")


class Topology(ElementBase):
    @property
    def body(self):
        return self._get_el(By.ID, "topology")

    @property
    def titlebar(self):
        return self._get_el(By.CSS_SELECTOR, "#topology > div.content-title")

    @property
    def resize(self):
        return self._get_el(By.XPATH, "//div[@id='topology']/div[5]")

    @property
    def switches(self):
        return self._get_els(By.CSS_SELECTOR, "#topology > div.switch")

    def get_switch(self, dpid, wait=False, timeout=30):
        id_ = "node-switch-%d" % int(dpid)
        el = self._get_el(By.ID, id_)
        while(wait and timeout and not el):
            time.sleep(1)
            timeout -= 1
            el = self._get_el(By.ID, id_)
        return el


class LinkList(ElementBase):
    @property
    def body(self):
        return self._get_el(By.ID, "link-list")

    @property
    def close(self):
        return self._get_el(By.XPATH, "//div[@id='link-list']/div/div[2]")

    @property
    def titlebar(self):
        return self._get_el(By.CSS_SELECTOR, "#link-list > div.content-title")

    @property
    def resize(self):
        return self._get_el(By.XPATH, "//div[@id='link-list']/div[6]")

    @property
    def rows(self):
        return self._get_els(By.CSS_SELECTOR,
                            "#link-list > td.content-table-item")


class FlowList(ElementBase):
    @property
    def body(self):
        return self._get_el(By.ID, "flow-list")

    @property
    def close(self):
        return self._get_el(By.XPATH, "//div[@id='flow-list']/div/div[2]")

    @property
    def titlebar(self):
        return self._get_el(By.CSS_SELECTOR, "#flow-list > div.content-title")

    @property
    def resize(self):
        return self._get_el(By.XPATH, "//div[@id='flow-list']/div[6]")

    @property
    def rows(self):
        return self._get_els(By.CSS_SELECTOR,
                             "#flow-list > td.content-table-item")
