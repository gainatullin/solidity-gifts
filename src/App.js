import React, { useState, useEffect } from 'react';
import { Gift, Send, Wallet, ExternalLink, Copy, Check, User, DollarSign } from 'lucide-react';
import { SEPOLIA_CHAIN_ID, CONTRACT_ADDRESS, CONTRACT_ABI, formatEther, isAddress, parseEther } from "core/constants";



function App() {
  const [account, setAccount] = useState('');
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [web3Loading, setWeb3Loading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('send');

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');

  const [giftId, setGiftId] = useState('');
  const [giftDetails, setGiftDetails] = useState(null);

  const [sentGifts, setSentGifts] = useState([]);
  const [receivedGifts, setReceivedGifts] = useState([]);
  const [txHash, setTxHash] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const createContract = (web3Instance) => {
    return new web3Instance.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask не установлен");
      }

      console.log('window.ethereum', await window.ethereum.request({ method: "eth_chainId" }))

      const chainId = await window.ethereum.request({ method: "eth_chainId" });

      if (chainId !== SEPOLIA_CHAIN_ID) {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: SEPOLIA_CHAIN_ID }],
        });
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const web3Instance = new window.Web3(window.ethereum);
      setWeb3(web3Instance);
      setAccount(accounts[0]);

      const contractInstance = createContract(web3Instance);
      setContract(contractInstance);
      setError("");
    } catch (error) {
      setError("Ошибка подключения: " + error.message);
    }
  };
  const sendGift = async () => {
    if (!contract || !web3) {
      setError('Контракт не подключен');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      if (!isAddress(recipient)) {
        throw new Error('Неверный адрес получателя');
      }

      if (!amount || parseFloat(amount) <= 0) {
        throw new Error('Сумма должна быть больше 0');
      }

      if (!message.trim()) {
        throw new Error('Сообщение не может быть пустым');
      }

      if (message.length > 280) {
        throw new Error('Сообщение слишком длинное (максимум 280 символов)');
      }

      const value = parseEther(amount);

      const tx = await contract.methods.sendGift(recipient, message).send({
        from: account,
        value: value
      });

      setTxHash(tx.transactionHash);

      const giftSentEvent = tx.events?.GiftSent;
      if (giftSentEvent) {
        const newGiftId = giftSentEvent.returnValues.giftId;
        const sentAmount = formatEther(giftSentEvent.returnValues.amount);
        setSuccess(`Подарок отправлен! ID: ${newGiftId}, Сумма: ${sentAmount} ETH`);
      } else {
        setSuccess('Подарок отправлен успешно!');
      }

      setRecipient('');
      setAmount('');
      setMessage('');

      setTimeout(() => {
        loadUserGifts();
      }, 2000);

    } catch (error) {
      setError('Ошибка: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const getGiftInfo = async () => {
    if (!contract || !giftId) return;

    try {
      setLoading(true);
      setError('');

      const gift = await contract.methods.getGift(giftId).call();
      setGiftDetails({
        from: gift[0],
        to: gift[1],
        amount: formatEther(gift[2]),
        message: gift[3],
        claimed: gift[4],
        timestamp: new Date(parseInt(gift[5]) * 1000)
      });
    } catch (error) {
      setError('Ошибка получения подарка: ' + error.message);
      setGiftDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const claimGift = async () => {
    if (!contract || !giftId) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const tx = await contract.methods.claimGift(giftId).send({
        from: account
      });

      setTxHash(tx.transactionHash);

      const giftClaimedEvent = tx.events?.GiftClaimed;
      if (giftClaimedEvent) {
        const claimedAmount = formatEther(giftClaimedEvent.returnValues.amount);
        setSuccess(`Подарок успешно получен! Получено ${claimedAmount} ETH`);
      } else {
        setSuccess('Подарок успешно получен!');
      }

      setTimeout(() => {
        getGiftInfo();
        loadUserGifts();
      }, 2000);

    } catch (error) {
      setError('Ошибка получения подарка: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUserGifts = async () => {
    if (!contract || !account) return;

    try {
      const [sent, received] = await Promise.all([
        contract.methods.getSentGifts(account).call(),
        contract.methods.getReceivedGifts(account).call()
      ]);

      const sentDetails = await Promise.all(
          sent.map(async (id) => {
            const gift = await contract.methods.getGift(id).call();
            return {
              id: id.toString(),
              from: gift[0],
              to: gift[1],
              amount: formatEther(gift[2]),
              message: gift[3],
              claimed: gift[4],
              timestamp: new Date(parseInt(gift[5]) * 1000)
            };
          })
      );

      const receivedDetails = await Promise.all(
          received.map(async (id) => {
            const gift = await contract.methods.getGift(id).call();
            return {
              id: id.toString(),
              from: gift[0],
              to: gift[1],
              amount: formatEther(gift[2]),
              message: gift[3],
              claimed: gift[4],
              timestamp: new Date(parseInt(gift[5]) * 1000)
            };
          })
      );

      setSentGifts(sentDetails);
      setReceivedGifts(receivedDetails);
    } catch (error) {
      console.error('Ошибка загрузки подарков:', error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  useEffect(() => {
    const loadWeb3 = async () => {
      if (window.ethereum) {
        try {
          if (!window.Web3) {
            const loadScript = () => {
              return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/web3/4.2.2/web3.min.js';
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Не удалось загрузить Web3'));
                document.head.appendChild(script);
              });
            };

            await loadScript();
          }
          setWeb3Loading(false);
        } catch (error) {
          console.error('Ошибка загрузки Web3:', error);
          setError('Не удалось загрузить Web3. Пожалуйста, обновите страницу.');
          setWeb3Loading(false);
        }
      } else {
        setWeb3Loading(false);
      }
    };
    loadWeb3();
  }, []);

  useEffect(() => {
    if (contract && account) {
      loadUserGifts();
    }
  }, [contract, account]);

  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount('');
          setContract(null);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  const GiftCard = ({ gift, type }) => (
      <div className="bg-white rounded-lg border-2 border-purple-200 p-4 mb-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-gray-800">ID: {gift.id}</span>
            {gift.claimed && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
              Получен
            </span>
            )}
          </div>
          <div className="text-right">
            <div className="font-bold text-lg text-purple-600">{gift.amount} ETH</div>
            <div className="text-xs text-gray-500">
              {gift.timestamp.toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="mb-3">
          <div className="text-sm text-gray-600 mb-1">
            <User className="w-4 h-4 inline mr-1" />
            {type === 'sent' ? 'Кому' : 'От'}: {formatAddress(type === 'sent' ? gift.to : gift.from)}
          </div>
        </div>

        <div className="bg-gray-50 rounded p-3 mb-3">
          <div className="text-sm text-gray-700 italic">"{gift.message}"</div>
        </div>

        {type === 'received' && !gift.claimed && gift.to.toLowerCase() === account.toLowerCase() && (
            <button
                onClick={() => {
                  setGiftId(gift.id);
                  setGiftDetails(gift);
                  setActiveTab('claim');
                }}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
            >
              Забрать подарок
            </button>
        )}
      </div>
  );

  return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <div className="flex justify-center items-center gap-3 mb-4">
              <Gift className="w-12 h-12 text-purple-600" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                CryptoGift
              </h1>
            </div>
            <p className="text-gray-600 text-lg">Отправляйте подарки в криптовалюте с персональными сообщениями</p>
          </div>

          {/* Подключение кошелька */}
          {web3Loading ? (
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
                <p className="text-gray-600">Загрузка Web3...</p>
              </div>
          ) : !window.ethereum ? (
              <div className="text-center">
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-4">
                  <p className="text-yellow-800 font-semibold mb-2">MetaMask не найден</p>
                  <p className="text-yellow-700 mb-4">Для использования приложения необходимо установить MetaMask</p>
                  <a
                      href="https://metamask.io/download/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Установить MetaMask
                  </a>
                </div>
              </div>
          ) : !account ? (
              <div className="text-center">
                <button
                    onClick={connectWallet}
                    className="bg-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2 mx-auto"
                >
                  <Wallet className="w-6 h-6" />
                  Подключить MetaMask
                </button>
              </div>
          ) : (
              <>
                {/* Информация об аккаунте */}
                <div className="bg-white rounded-lg p-4 mb-6 border-2 border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold">Подключен:</span>
                      <span className="text-purple-600">{formatAddress(account)}</span>
                    </div>
                    <button
                        onClick={() => copyToClipboard(account)}
                        className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {CONTRACT_ADDRESS === "0x..." && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
                      <p className="text-yellow-800">
                        ⚠️ Пожалуйста, замените CONTRACT_ADDRESS в коде на адрес вашего задеплоенного контракта
                      </p>
                    </div>
                )}

                {/* Навигация */}
                <div className="flex flex-wrap gap-2 mb-6 bg-white rounded-lg p-2 border-2 border-purple-200">
                  {[
                    { id: 'send', label: 'Отправить', icon: Send },
                    { id: 'claim', label: 'Получить', icon: Gift },
                    { id: 'sent', label: 'Отправленные', icon: User },
                    { id: 'received', label: 'Полученные', icon: DollarSign }
                  ].map(({ id, label, icon: Icon }) => (
                      <button
                          key={id}
                          onClick={() => setActiveTab(id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                              activeTab === id
                                  ? 'bg-purple-600 text-white'
                                  : 'text-gray-600 hover:bg-purple-50'
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                  ))}
                </div>

                {/* Уведомления */}
                {error && (
                    <div className="bg-red-50 border-2 border-red-200 text-red-800 p-4 rounded-lg mb-4">
                      {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-50 border-2 border-green-200 text-green-800 p-4 rounded-lg mb-4">
                      {success}
                      {txHash && (
                          <div className="mt-2">
                            <a
                                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                            >
                              Посмотреть в Etherscan <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                      )}
                    </div>
                )}

                {/* Контент вкладок */}
                <div className="bg-white rounded-lg border-2 border-purple-200 p-6">
                  {activeTab === 'send' && (
                      <div>
                        <h2 className="text-2xl font-bold mb-6 text-gray-800">Отправить подарок</h2>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Адрес получателя
                            </label>
                            <input
                                type="text"
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                placeholder="0x..."
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Сумма (ETH)
                            </label>
                            <input
                                type="number"
                                step="0.001"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.001"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Сообщение (до 280 символов)
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Поздравляю с днем рождения! 🎉"
                                maxLength={280}
                                rows={3}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                            />
                            <div className="text-right text-sm text-gray-500 mt-1">
                              {message.length}/280
                            </div>
                          </div>

                          <button
                              onClick={sendGift}
                              disabled={loading || !contract}
                              className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {loading ? 'Отправляем...' : 'Отправить подарок'}
                          </button>
                        </div>
                      </div>
                  )}

                  {activeTab === 'claim' && (
                      <div>
                        <h2 className="text-2xl font-bold mb-6 text-gray-800">Получить подарок</h2>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              ID подарка
                            </label>
                            <div className="flex gap-2">
                              <input
                                  type="number"
                                  value={giftId}
                                  onChange={(e) => setGiftId(e.target.value)}
                                  placeholder="1"
                                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              />
                              <button
                                  onClick={getGiftInfo}
                                  disabled={loading || !giftId || !contract}
                                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                              >
                                Проверить
                              </button>
                            </div>
                          </div>

                          {giftDetails && (
                              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h3 className="font-semibold text-lg">Информация о подарке</h3>
                                    <p className="text-sm text-gray-600">ID: {giftId}</p>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-xl text-purple-600">
                                      {giftDetails.amount} ETH
                                    </div>
                                    {giftDetails.claimed && (
                                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                Получен
                              </span>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                  <div>
                                    <span className="font-medium">От:</span> {formatAddress(giftDetails.from)}
                                  </div>
                                  <div>
                                    <span className="font-medium">Кому:</span> {formatAddress(giftDetails.to)}
                                  </div>
                                  <div>
                                    <span className="font-medium">Дата:</span> {giftDetails.timestamp.toLocaleString()}
                                  </div>
                                </div>

                                <div className="bg-white rounded p-3">
                                  <div className="font-medium text-sm text-gray-700 mb-1">Сообщение:</div>
                                  <div className="italic">"{giftDetails.message}"</div>
                                </div>

                                {!giftDetails.claimed &&
                                    giftDetails.to.toLowerCase() === account.toLowerCase() && (
                                        <button
                                            onClick={claimGift}
                                            disabled={loading}
                                            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                                        >
                                          {loading ? 'Получаем...' : 'Забрать подарок'}
                                        </button>
                                    )}

                                {giftDetails.to.toLowerCase() !== account.toLowerCase() && (
                                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                                      <p className="text-yellow-800 text-sm">
                                        Этот подарок предназначен не для вашего адреса.
                                      </p>
                                    </div>
                                )}
                              </div>
                          )}
                        </div>
                      </div>
                  )}

                  {activeTab === 'sent' && (
                      <div>
                        <h2 className="text-2xl font-bold mb-6 text-gray-800">Отправленные подарки</h2>

                        {sentGifts.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <Gift className="w-16 h-16 mx-auto mb-4 opacity-50" />
                              <p>Вы еще не отправляли подарки</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                              {sentGifts.map((gift) => (
                                  <GiftCard key={gift.id} gift={gift} type="sent" />
                              ))}
                            </div>
                        )}
                      </div>
                  )}

                  {activeTab === 'received' && (
                      <div>
                        <h2 className="text-2xl font-bold mb-6 text-gray-800">Полученные подарки</h2>

                        {receivedGifts.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <Gift className="w-16 h-16 mx-auto mb-4 opacity-50" />
                              <p>Вы еще не получали подарки</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                              {receivedGifts.map((gift) => (
                                  <GiftCard key={gift.id} gift={gift} type="received" />
                              ))}
                            </div>
                        )}
                      </div>
                  )}
                </div>
              </>
          )}
        </div>
      </div>
  );
}

export default App;
