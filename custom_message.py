from ryu.controller import ofp_event, event

class PortMessage(event.EventBase):
    def __init__(self, msg):
        super(PortMessage, self).__init__()
        self.msg = msg

class DPIMessage(event.EventBase):
    def __init__(self, msg):
        super(DPIMessage, self).__init__()
        self.msg = msg
