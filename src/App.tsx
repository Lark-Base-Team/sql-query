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

      // TODO: type暂时还没有进行额外映射，后续处理
      const columns = info.fieldMetaList.map(item => ({
        name: item.name,
        type: "TEXT",
        is_primary: item.isPrimary
      }));

      const requestData: RequestPayload = {
        request_id: "",
        query: input.current,
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

      const data = await callApi(requestData);
      // 前端输出返回结果
      setResult(String(data.sql));
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

const callApi = async (payload: RequestPayload) => {
  try {
    console.log("输入数据,", JSON.stringify(payload))
    const response = await fetch('https://bytebrain.bytedance.net/openapi/lark/text2sql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      // mode: 'no-cors', // 添加这一行
    });
    const text = await response.json()
    console.log("输出数据,", text)
    return text;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
