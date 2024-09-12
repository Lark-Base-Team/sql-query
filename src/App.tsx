import { bitable, IFieldMeta, ITableMeta } from "@lark-base-open/js-sdk";
import { Button, Form, Input, message, Spin } from "antd";
import { TFunction } from "i18next";
import './App.css';
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

// 定义输入接口信息
interface Column {
  name: string;
  type: string;
  is_primary: boolean;
}

interface Table {
  name: string;
  columns: Column[];
}

interface DbMetadata {
  db_id: string;
  tables: Table[];
}

interface RequestPayload {
  request_id: string;
  query: string;
  external_knowledge: string[];
  model: string;
  stream: boolean;
  use_explanation: boolean;
  use_fallback: boolean;
  use_validator: boolean;
  db_metadata: DbMetadata;
}

export default function App() {
  const { t } = useTranslation();
  const input = useRef('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const baseInfo = useRef<{
    tableMeta: ITableMeta;
    tableMetaList: ITableMeta[];
    fieldMetaList: IFieldMeta[];
  }>();

  // 获取线上db信息
  const getInfo = async () => {
    const info = await getMeta({ t });
    baseInfo.current = info;
    return info;
  };

  const query = async () => {
    setLoading(true);
    try {
      const info = await getInfo();
      console.log('===传给后端的参数：', info);
      info.fieldMetaList.forEach(item => {
        console.log(`name: ${item.name}, primary: ${item.isPrimary}, description: ${item.description.content}`);
      });
      console.log('表名', info.tableMeta.name);

      // 将 fieldMetaList 适配为 columns
      const columns = info.fieldMetaList.map(item => ({
        name: item.name,
        type: "TEXT",
        is_primary: item.isPrimary
      }));

      const requestData: RequestPayload = {
        request_id: "",
        query: "列出所有中国的机构",
        external_knowledge: [],
        model: "lab-sql-optimized-20240426",
        stream: false,
        use_explanation: true,
        use_fallback: false,
        use_validator: false,
        db_metadata: {
          db_id: "",
          tables: [
            {
              name: info.tableMeta.name,
              columns: columns
            }
          ]
        }
      };

      console.log('数据', JSON.stringify({ requestData }));
      const data = await callApi(requestData);
      console.log('输出', data)
      // const res = await getResult(requestData);
      // if (res) {
      //   setResult(JSON.stringify(res, null, '  '));
      // }
    } catch (e) {
      setResult(String(e));
    } finally {
      setLoading(false);
    }
  };

  return <Spin spinning={loading}>
    <div className="container">
      <div className="content-top">
        <p>{t('以自然语言描述，即可查询对应结果。例如：查询文本中包含apple的记录')}</p>
        <Input.TextArea
          onChange={(e) => {
            input.current = e.target.value;
          }} />

        <br></br>

        <Button onClick={query}>
          {t('查询')}
        </Button>
      </div>
      <div className="full-content">
        <Input.TextArea readOnly style={{ height: '100%', width: '100%', overflow: 'auto', whiteSpace: 'pre', padding: '8px' }} value={result} />
      </div>
    </div>
  </Spin >
}

async function getMeta(params: { t: TFunction<"translation", undefined> }) {
  const { t } = params;
  const { tableId } = await bitable.base.getSelection();
  if (!tableId) {
    message.error(t('获取数据表为空'));
    throw new Error('获取数据表错误');
  }
  const table = await bitable.base.getTableById(tableId);
  const fieldMetaList = await table.getFieldMetaList();
  const tableMeta = await table.getMeta();
  const tableMetaList = await bitable.base.getTableMetaList();
  
  return {
    tableMeta,
    tableMetaList,
    fieldMetaList,
  };
}

// async function getResult(params: { requestpayload: RequestPayload }) {
//   const { requestpayload } = params;
//   const res = await fetch('https://', {
//     method: 'POST',
//     body: JSON.stringify({ requestpayload })
//   });
//   return res.json();
// }

const callApi = async (payload: RequestPayload) => {
  try {
    console.log("输入数据,", JSON.stringify(payload))
    const response = await fetch('https://test-bytebrain.byted.org/openapi/dbw/text2sql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }




};
