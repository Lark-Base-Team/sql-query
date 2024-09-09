import { bitable, IFieldMeta, ITableMeta } from "@lark-base-open/js-sdk"
import { Button, Form, Input, message, Spin } from "antd";
import { TFunction } from "i18next";
import './App.css';
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next";

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

  const getInfo = async () => {
    const info = await getMeta({ t });
    baseInfo.current = (info);
    return info
  };

  const query = async () => {
    setLoading(true);
    try {
      const info = await getInfo();
      console.log('===传给后端的参数：', info);
      const res = await getResult(info);
      if (res) {
        setResult(JSON.stringify(res, null, '  '));
      }
    } catch (e) {
      setResult(String(e));
    } finally {
      setLoading(false);
    }
  }

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
    tableMeta,//所选数据的信息
    tableMetaList,//所有数据表的信息
    fieldMetaList,// 所选数据表的字段信息
  }
}

async function getResult(params: {
  tableMeta: ITableMeta;
  tableMetaList: ITableMeta[];
  fieldMetaList: IFieldMeta[];
}) {
  const {
    tableMeta,
    tableMetaList,
    fieldMetaList,
  } = params;
  const res = await fetch('https://', {
    method: 'POST',
    body: JSON.stringify({
      tableMeta,
      tableMetaList,
      fieldMetaList,
    })
  });
  return res;
}