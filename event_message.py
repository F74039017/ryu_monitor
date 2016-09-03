from ryu.controller import ofp_event, event

class EventMessage(event.EventBase):
    def __init__(self, msg):
        super(EventMessage, self).__init__()
        self.msg = msg
