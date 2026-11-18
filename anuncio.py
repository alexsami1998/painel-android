import socket
import time

import ifaddr
from zeroconf import ServiceInfo, Zeroconf

PORTA = 8830


def ips():
    return sorted({ip.ip for a in ifaddr.get_adapters() for ip in a.ips
                   if isinstance(ip.ip, str) and not ip.ip.startswith(('127.', '169.254.'))})


def info(lista):
    return ServiceInfo('_http._tcp.local.', 'Painel._http._tcp.local.', port=PORTA, server='painel.local.',
                       addresses=[socket.inet_aton(i) for i in lista])


zc, atual, servico = None, None, None
while True:
    try:
        lista = ips()
        if lista != atual:
            if zc:
                zc.close()
            zc = Zeroconf()
            servico = info(lista)
            zc.register_service(servico, allow_name_change=True)
            atual = lista
            print('painel.local ->', ', '.join(lista), flush=True)
        else:
            zc.update_service(servico)
    except Exception as e:
        print('anuncio:', e, flush=True)
        atual = None
    time.sleep(30)
