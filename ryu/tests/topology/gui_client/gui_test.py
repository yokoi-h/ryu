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

import re
import unittest
from nose.tools import ok_, eq_
from nose.plugins.skip import SkipTest

from selenium import webdriver
from selenium.webdriver.common.action_chains import ActionChains

import gui_elements


# GUI app address
GUI_HOST = '127.0.0.1'
GUI_PORT = '8000'
BASE_URL = 'http://%s:%s' % (GUI_HOST, GUI_PORT)

# REST app address
REST_HOST = 'localhost'
REST_PORT = '8080'

# ryu controller address
RYU_HOST = '127.0.0.1'
RYU_PORT = '6633'


class TestGUI(unittest.TestCase):
    # called before the TestCase run.
    @classmethod
    def setUpClass(cls):
        cls._set_driver()
        ok_(cls.driver, 'driver dose not setting.')
        cls.el = gui_elements.Elements(cls.driver)
        cls.el.register_contents()

    # called after the TestCase run.
    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()

    # called before an individual test_* run.
    def setUp(self):
        self.driver.get(BASE_URL + "/")
        self.el.wait_for_displayed(self.el.dialog.body())

    # called in to setUpClass().
    @classmethod
    def _set_driver(cls):
        # set the driver of the test browser.
        # self.driver = webdriver.Firefox()
        cls.driver = None

    def mouse(self):
        return ActionChains(self.driver)

    def test_default(self):
        ## input-dialog
        # is_displayed, host=GUI_HOST, port=8080
        dialog = self.el.dialog
        ok_(dialog.body().is_displayed())
        eq_(GUI_HOST, dialog.host().get_attribute("value"))
        eq_('8080', dialog.port().get_attribute("value"))

        # click "cancel"
        dialog.cancel().click()

        ## topology
        # "Disconnected", not switches
        topology = self.el.topology
        ok_(re.search(r"Disconnected", topology.body().text))
        ok_(not topology.switches())

        ## link-list
        # is_displayed, no data
        link = self.el.link_list
        ok_(link.body().is_displayed())
        ok_(not link.rows())

        ## flow-list
        # is_displayed, no data
        flow = self.el.flow_list
        ok_(flow.body().is_displayed())
        ok_(not flow.rows())

    def _test_contents_close_open(self, target, opener):
        # close
        target.close().click()
        ok_(not target.body().is_displayed())

        # open
        opener.click()
        ok_(self.el.wait_for_displayed(target.body()))

    def test_contents_close_open(self):
        menu = self.el.menu
        ## input-dialog
        dialog = self.el.dialog
        self._test_contents_close_open(dialog, menu.dialog())
        dialog.close().click()

        ## link-list
        link = self.el.link_list
        self._test_contents_close_open(link, menu.link_list())

        ## flow-list
        flow = self.el.flow_list
        self._test_contents_close_open(flow, menu.flow_list())

    def _test_contents_draggble(self, target):
        # TODO: fail if location over to window size
        move = 10
        xoffset = target.location['x'] + move
        yoffset = target.location['y'] + move
        mouse = self.mouse()
        mouse.click(target)
        mouse.drag_and_drop_by_offset(target, move, move)
        mouse.perform()

        eq_(target.location['x'], xoffset)
        eq_(target.location['y'], yoffset)

    def test_contents_draggble(self):
        self.el.dialog.close().click()

        ## menu
        self._test_contents_draggble(self.el.menu.titlebar())

        ## topology
        self._test_contents_draggble(self.el.topology.titlebar())

        ## link-list
        self._test_contents_draggble(self.el.link_list.titlebar())

        ## flow-list
        self._test_contents_draggble(self.el.flow_list.titlebar())

    def test_contents_resize(self):
        # TODO: contents resize
        raise SkipTest("TODO: contents resize")

    def test_connected(self):
        # input host
        host = self.el.dialog.host()
        host.clear()
        host.send_keys(REST_HOST)

        # input port
        port = self.el.dialog.port()
        port.clear()
        port.send_keys(REST_PORT)

        # click "Launch"
        self.el.dialog.launch().click()
        ok_(self.el.wait_for_text(self.el.topology.body(), "Connected"))


if __name__ == "__main__":
    unittest.main()
